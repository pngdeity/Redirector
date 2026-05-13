
//This is the background script. It is responsible for actually redirecting requests,
//as well as monitoring changes in the redirects and the disabled status and reacting to them.
function log(msg, force) {
	if (log.enabled || force) {
		console.log('REDIRECTOR: ' + msg);
	}
}
log.enabled = false;
var enableNotifications=false;

// MV3: Service Worker environment - no window/DOM access
var isFirefox = !!navigator.userAgent.match(/Firefox/i);

// Helper for storage area
async function getStorageArea() {
	const obj = await chrome.storage.local.get({isSyncEnabled: false});
	return obj.isSyncEnabled ? chrome.storage.sync : chrome.storage.local;
}

//Redirects partitioned by request type, used for history state updates (still needed in MV3)
var partitionedRedirects = {};
var logEnabled = false;

function log(msg, force) {
	if (logEnabled || force) {
		console.log('REDIRECTOR: ' + msg);
	}
}

async function setIcon(image) {
	var data = { 
		path: {}
	};

	for (let nr of [16,19,32,38,48,64,128]) {
		data.path[nr] = `images/${image}-${nr}.png`;
	}

	try {
		await chrome.action.setIcon(data);
	} catch (err) {
		log('Error in SetIcon: ' + err.message);
	}
}

//Monitor changes in data, and setup everything again.
async function monitorChanges(changes, namespace) {
	if (changes.disabled) {
		await updateIcon();

		if (changes.disabled.newValue == true) {
			log('Disabling Redirector, removing listener');
			chrome.webNavigation.onHistoryStateUpdated.removeListener(checkHistoryStateRedirects);
            await clearDNRRules();
		} else {
			log('Enabling Redirector, setting up listener');
			await setUpRedirectListener();
		}
	}

	if (changes.redirects) {
		log('Redirects have changed, setting up listener again');
		await setUpRedirectListener();
    }

    if (changes.logging) {
		logEnabled = changes.logging.newValue;
		log('Logging settings have changed to ' + changes.logging.newValue, true); 
	}
	if (changes.enableNotifications){
		log('notifications setting changed to ' + changes.enableNotifications.newValue);
		enableNotifications = changes.enableNotifications.newValue;
	}
}
chrome.storage.onChanged.addListener(monitorChanges);

function createPartitionedRedirects(redirects) {
	var partitioned = {};

	for (var i = 0; i < redirects.length; i++) {
		var redirect = new Redirect(redirects[i]);
		redirect.compile();
		for (var j=0; j<redirect.appliesTo.length;j++) {
			var requestType = redirect.appliesTo[j];
			if (partitioned[requestType]) {
				partitioned[requestType].push(redirect); 
			} else {
				partitioned[requestType] = [redirect];
			}
		}
	}
	return partitioned;	
}

async function clearDNRRules() {
    try {
        const rules = await chrome.declarativeNetRequest.getDynamicRules();
        const ids = rules.map(r => r.id);
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: ids
        });
    } catch (err) {
        console.error("Error clearing DNR rules: " + err.message);
    }
}

//Sets up the listener, partitions the redirects, creates the appropriate filters etc.
async function setUpRedirectListener() {

	chrome.webNavigation.onHistoryStateUpdated.removeListener(checkHistoryStateRedirects);

    const storage = await getStorageArea();
    const obj = await storage.get({redirects:[]});
    const { disabled } = await chrome.storage.local.get({disabled:false});

    const redirects = obj.redirects;
    
    // MV3: Update DNR Rules
    await clearDNRRules();

    if (disabled) {
        log('Redirector is disabled');
        return;
    }

    if (redirects.length > 0) {
        var dnrRules = convertToDNRRules(redirects);
        log('Updating DNR rules: ' + dnrRules.length);
        try {
            await chrome.declarativeNetRequest.updateDynamicRules({
                addRules: dnrRules
            });
        } catch (err) {
            console.error("Error updating DNR rules: " + err.message);
        }
    }

    partitionedRedirects = createPartitionedRedirects(redirects);

    if (partitionedRedirects.history) {
        log('Adding HistoryState Listener');

        let filter = { url : []};
        for (let r of partitionedRedirects.history) {
            filter.url.push({urlMatches: r._preparePattern(r.includePattern)});
        }
        chrome.webNavigation.onHistoryStateUpdated.addListener(checkHistoryStateRedirects, filter);
    }
}

//Redirect urls on places like Facebook and Twitter who don't do real reloads, only do ajax updates and push a new url to the address bar...
async function checkHistoryStateRedirects(ev) {
    if (Object.keys(partitionedRedirects).length === 0) {
        const storage = await getStorageArea();
        const obj = await storage.get({redirects:[]});
        partitionedRedirects = createPartitionedRedirects(obj.redirects);
    }
	ev.type = 'history';
	ev.method = 'GET';
	let result = checkRedirectsForHistory(ev);
	if (result.redirectUrl) {
		chrome.tabs.update(ev.tabId, {url: result.redirectUrl});
	}
}

function checkRedirectsForHistory(details) {
    var list = partitionedRedirects[details.type];
	if (!list) {
		return {};
	}
    // Simple check
	for (var i = 0; i < list.length; i++) {
		var r = list[i];
		var result = r.getMatch(details.url);
		if (result.isMatch) {
            log('Redirecting HistoryState ' + details.url + ' ===> ' + result.redirectTo);
			return { redirectUrl: result.redirectTo };
		}
	}
    return {};
}

//Sets on/off badge, and for Chrome updates dark/light mode icon
async function updateIcon() {
	const { disabled } = await chrome.storage.local.get({disabled:false});

    if (disabled) {
        chrome.action.setBadgeText({text: 'off'});
        chrome.action.setBadgeBackgroundColor({color: '#fc5953'});
    } else {
        chrome.action.setBadgeText({text: 'on'});
        chrome.action.setBadgeBackgroundColor({color: '#35b44a'});
    }
    // Set text color if supported (Firefox)
    if (chrome.action.setBadgeTextColor) {
        chrome.action.setBadgeTextColor({color: '#fafafa'});
    }
}


//Firefox doesn't allow the "content script" which is actually privileged
//to access the objects it gets from chrome.storage directly, so we
//proxy it through here.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    handleMessage(request, sender, sendResponse);
    return true; // Keep channel open for async response
});

async function handleMessage(request, sender, sendResponse) {
    log('Received background message: ' + JSON.stringify(request));
    const storageArea = await getStorageArea();

    if (request.type == 'get-redirects') {
        log('Getting redirects from storage');
        const obj = await storageArea.get({ redirects: [] });
        sendResponse(obj);
        log('Sent redirects to content page');

    } else if (request.type == 'save-redirects') {
        console.log('Saving redirects, count=' + request.redirects.length);
        const redirects = request.redirects;
        try {
            await storageArea.set({ redirects });
            log('Finished saving redirects to storage');
            sendResponse({ message: "Redirects saved" });
        } catch (err) {
            if (err.message.indexOf("QUOTA_BYTES_PER_ITEM quota exceeded") > -1) {
                log("Redirects failed to save as size of redirects larger than allowed limit per item by Sync");
                sendResponse({
                    message: "Redirects failed to save as size of redirects larger than what's allowed by Sync. Refer Help Page"
                });
            } else {
                sendResponse({ message: "Error saving redirects: " + err.message });
            }
        }
    } else if (request.type == 'update-icon') {
        await updateIcon();
        sendResponse({ message: "Icon updated" });
    } else if (request.type == 'toggle-sync') {
        await handleToggleSync(request, sendResponse);
    } else {
        log('Unexpected message: ' + JSON.stringify(request));
        sendResponse({ message: "Unexpected message type" });
    }
}

async function handleToggleSync(request, sendResponse) {
    log('toggling sync to ' + request.isSyncEnabled);
    await chrome.storage.local.set({ isSyncEnabled: request.isSyncEnabled });

    if (request.isSyncEnabled) {
        const syncStorage = chrome.storage.sync;
        const size = await new Promise(resolve => chrome.storage.local.getBytesInUse("redirects", resolve));
        
        if (size > syncStorage.QUOTA_BYTES_PER_ITEM) {
            log("size of redirects " + size + " is greater than allowed for Sync which is " + syncStorage.QUOTA_BYTES_PER_ITEM);
            await chrome.storage.local.set({ isSyncEnabled: false });
            sendResponse({
                message: "Sync Not Possible - size of Redirects larger than what's allowed by Sync. Refer Help page"
            });
        } else {
            const obj = await chrome.storage.local.get({ redirects: [] });
            if (obj.redirects.length > 0) {
                await chrome.storage.sync.set(obj);
                log('redirects moved from Local to Sync Storage Area');
                await chrome.storage.local.remove("redirects");
                await setUpRedirectListener();
                sendResponse({ message: "sync-enabled" });
            } else {
                log('No redirects are setup currently in Local, just enabling Sync');
                sendResponse({ message: "sync-enabled" });
            }
        }
    } else {
        const obj = await chrome.storage.sync.get({ redirects: [] });
        if (obj.redirects.length > 0) {
            await chrome.storage.local.set(obj);
            log('redirects moved from Sync to Local Storage Area');
            await chrome.storage.sync.remove("redirects");
            await setUpRedirectListener();
            sendResponse({ message: "sync-disabled" });
        } else {
            sendResponse({ message: "sync-disabled" });
        }
    }
}


//First time setup
(async () => {
    const obj = await chrome.storage.local.get({logging:false, enableNotifications: false});
    logEnabled = obj.logging;
    enableNotifications = obj.enableNotifications;
    
    await updateIcon();
    await setUpRedirectListener();
    log('Redirector starting up...');
})();


// Below is a feature request by an user who wished to see visual indication for an Redirect rule being applied on URL 
// https://github.com/einaregilsson/Redirector/issues/72
// By default, we will have it as false. If user wishes to enable it from settings page, we can make it true until user disables it (or browser is restarted)

// Upon browser startup, just set enableNotifications to false.
// Listen to a message from Settings page to change this to true.
function sendNotifications(redirect, originalUrl, redirectedUrl ){
	log("Showing redirect success notification");
	let icon = "images/icon-light-theme-48.png"; // MV3 simple default

	if(navigator.userAgent.toLowerCase().indexOf("chrome") > -1 && navigator.userAgent.toLowerCase().indexOf("opr")<0){
		
		var items = [{title:"Original page: ", message: originalUrl},{title:"Redirected to: ",message: redirectedUrl}];
		var head = "Redirector - Applied rule : " + redirect.description;
		chrome.notifications.create({
			type : "list",
			items : items,
			title : head,
			message : head,
			iconUrl : icon
		  });	
		}
	else{
		var message = "Applied rule : " + redirect.description + " and redirected original page " + originalUrl + " to " + redirectedUrl;

		chrome.notifications.create({
        	type : "basic",
        	title : "Redirector",
			message : message,
			iconUrl : icon
		});
	}
}

chrome.runtime.onStartup.addListener(handleStartup);
async function handleStartup(){
	await chrome.storage.local.set({
		enableNotifications: false
	});
    enableNotifications = false;
	await updateIcon(); 
}