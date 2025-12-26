/**
 * JS version of PHP's empty() function
 * @param {*} mixedVar thing
 * @returns bool
 */
function empty(mixedVar) {
	//  discuss at: https://locutus.io/php/empty/
	// original by: Philippe Baumann
	//    input by: Onno Marsman (https://twitter.com/onnomarsman)
	//    input by: LH
	//    input by: Stoyan Kyosev (https://www.svest.org/)
	// bugfixed by: Kevin van Zonneveld (https://kvz.io)
	// improved by: Onno Marsman (https://twitter.com/onnomarsman)
	// improved by: Francesco
	// improved by: Marc Jansen
	// improved by: Rafał Kukawski (https://blog.kukawski.pl)
	//   example 1: empty(null)
	//   returns 1: true
	//   example 2: empty(undefined)
	//   returns 2: true
	//   example 3: empty([])
	//   returns 3: true
	//   example 4: empty({})
	//   returns 4: true
	//   example 5: empty({'aFunc' : function () { alert('humpty'); } })
	//   returns 5: false

	let undef
	let key
	let i
	let len
	const emptyValues = [undef, null, false, 0, '', '0']

	for (i = 0, len = emptyValues.length; i < len; i++) {
		if (mixedVar === emptyValues[i]) {
			return true
		}
	}

	if (typeof mixedVar === 'object') {
		for (key in mixedVar) {
			if (mixedVar.hasOwnProperty(key)) {
				return false
			}
		}
		return true
	}

	return false
}

/**
 * Backend logic for the sidebar
 */
const BE = {
	/**
	 * Stored roles data
	 */
	roles: {},
	/**
	 * Entry point
	 */
	_init: function () {
		// listen for export button click
		document.getElementById('exportBtn').addEventListener('click', BE._exportButtonClickHandler);

		// query the active linkedin experience tab
		browser.tabs.query({ currentWindow: true, active: true }).then((tabs) => {
			for (const tab of tabs) {
				if (/https?:\/\/(?:[\w-]+\.)?linkedin\.com\/in\/[^\/]+\/details\/experience(?:\/|$)/i.test(tab.url)) {
					// send a message to the content script to extract experience data
					browser.tabs.sendMessage(tab.id, {})
						// handle the response from the content script
						.then(async (response) => {
							// build the roles
							roles = response.response.work || {};
							let rolesCount = 0;
							let storedRoles = await browser.storage.local.get('rolesToStore');
							storedRoles = !empty(storedRoles) ? storedRoles.rolesToStore : response.response.work.map(role => role.id);

							// populate the sidebar with checkboxes
							for (const role of response.response.work) {
								document.getElementById('roles').insertAdjacentHTML('beforeend', `
									<div>
										<input type="checkbox" id="${role.id}" ${storedRoles.includes(role.id) ? 'checked' : ''} />
										<label for="${role.id}"><strong>${role.name} at ${role.position}</strong></label><br/>
										${role.startDate} - ${role.endDate || 'Present'}<br/>
										${role.summary || ''}
									</div>
								`);
								rolesCount += 1;
							}

							// listen for checkbox changes to store preferences
							document.querySelectorAll('#roles input[type=checkbox]').forEach(checkbox => {
								checkbox.addEventListener('change', () => {
									const rolesToExport = [...document.querySelectorAll('#roles input[type=checkbox]:checked')].map(checkbox => checkbox.id);
									browser.storage.local.set({ rolesToStore: rolesToExport });
								});
							})
						})
						.catch((err) => {
							console.warn('sendMessage failed (no receiving content script):', err);
						});
				}
			}
		});
	},
	/**
	 * Handles export button click
	 */
	_exportButtonClickHandler: function () {
		const checked = document.querySelectorAll('#roles input[type=checkbox]:checked');

		let output = '';
		if (checked.length > 0) {
			const rolesToExport = [...checked].map(checkbox => roles.filter(role => role.id === checkbox.id)[0]);
			output = {
				work: rolesToExport.map(role => {
					delete role.id;
					return role;
				}),
			};
		} else {
			output = { work: [] };
		}

		// trigger download of JSON file
		const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(output, null, 2));
		const downloadAnchorNode = document.createElement('a');
		downloadAnchorNode.setAttribute("href", dataStr);
		downloadAnchorNode.setAttribute("download", "linkedin_experience.json");
		// required for firefox
		document.body.appendChild(downloadAnchorNode); 
		downloadAnchorNode.click();
		downloadAnchorNode.remove();
	},
};

// let's go!
BE._init();
