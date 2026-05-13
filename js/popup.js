

var storage = chrome.storage.local;
var viewModel = {}; //Just an object for the databinding

function applyBinding() {
	dataBind(document.body, viewModel);
}

async function toggle(prop) {
	const obj = await storage.get({[prop]: false});
    const newValue = !obj[prop];
    await storage.set({[prop] : newValue});
    viewModel[prop] = newValue;
    applyBinding();
}

async function openRedirectorSettings() {

	//switch to open one if we have it to minimize conflicts
	var url = chrome.runtime.getURL('redirector.html');
	
	//FIREFOXBUG: Firefox chokes on url:url filter if the url is a moz-extension:// url
	//so we don't use that, do it the more manual way instead.
	const tabs = await chrome.tabs.query({currentWindow:true});
    for (var i=0; i < tabs.length; i++) {
        if (tabs[i].url == url) {
            await chrome.tabs.update(tabs[i].id, {active:true});
            window.close();
            return;
        }
    }

    await chrome.tabs.create({url:url, active:true});
};


async function pageLoad() {
	const obj = await storage.get({logging:false, enableNotifications:false, disabled: false});
    viewModel = obj;
    applyBinding();

	el('#enable-notifications').addEventListener('input', () => toggle('enableNotifications'));
	el('#enable-logging').addEventListener('input', () => toggle('logging'));
	el('#toggle-disabled').addEventListener('click', () => toggle('disabled'));
	el('#open-redirector-settings').addEventListener('click', openRedirectorSettings);
}

pageLoad();
//Setup page...
