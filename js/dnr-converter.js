
// Converts Redirector rules to DeclarativeNetRequest rules
function convertToDNRRules(redirects) {
	var rules = [];
	var id = 1;

	redirects.forEach(function(r) {
		if (r.disabled) {
			return;
		}

		// We cannot support advanced processing in DNR
		if (r.processMatches && r.processMatches !== 'noProcessing' && r.processMatches !== 'urlEncode' && r.processMatches !== 'urlDecode') {
			console.warn('Redirector: Rule "' + r.description + '" uses unsupported processMatches: ' + r.processMatches);
			return;
		}

		// Use the Redirect class to prepare the pattern (handles Wildcard -> Regex conversion)
		var redirect = new Redirect(r);
		var regexFilter = redirect._preparePattern(r.includePattern);
		
		// Remove start/end anchors if they are not needed or adjust for DNR
		// DNR regexFilter matches the url. 
		// Redirector's _preparePattern adds ^ and $ for Wildcards.
		// RE2 supports ^ and $, so this should be fine.

		// Map Resource Types
		var resourceTypes = mapRequestTypes(r.appliesTo);
		if (resourceTypes.length === 0) {
			return;
		}

		// Handle Exclude Pattern (Create an Allow rule with higher priority)
		if (r.excludePattern) {
			var excludeRegex = redirect._preparePattern(r.excludePattern);
			rules.push({
				id: id++,
				priority: 2,
				action: { type: 'allow' },
				condition: {
					regexFilter: excludeRegex,
					resourceTypes: resourceTypes,
					isUrlFilterCaseSensitive: false
				}
			});
		}

		// Handle Redirect
		// Convert JS capture groups $1, $2 to DNR \1, \2
		var substitution = r.redirectUrl.replace(/\$(\d+)/g, '\\$1');

		rules.push({
			id: id++,
			priority: 1,
			action: {
				type: 'redirect',
				redirect: { regexSubstitution: substitution }
			},
			condition: {
				regexFilter: regexFilter,
				resourceTypes: resourceTypes,
				isUrlFilterCaseSensitive: false
			}
		});
	});

	return rules;
}

function mapRequestTypes(appliesTo) {
	var dnrTypes = [];
	var mapping = {
		'main_frame': 'main_frame',
		'sub_frame': 'sub_frame',
		'stylesheet': 'stylesheet',
		'script': 'script',
		'image': 'image',
		'imageset': 'image', // Best guess
		'font': 'font',
		'object': 'object',
		'object_subrequest': 'object', // Best guess
		'xmlhttprequest': 'xmlhttprequest',
		'media': 'media',
		'other': 'other'
	};

	appliesTo.forEach(function(type) {
		if (mapping[type]) {
			if (dnrTypes.indexOf(mapping[type]) === -1) {
				dnrTypes.push(mapping[type]);
			}
		}
	});

	// Remove 'history' as it is not a network request type
	return dnrTypes;
}
