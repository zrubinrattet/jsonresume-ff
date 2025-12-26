/**
 * Frontend content script for LinkedIn experience extraction
 */
const FE = {
	/**
	 * Entry point
	 */
	_init: function () {
		// init the network quiescence event
		FE.connect._init();
		// init the experience data extraction
		FE.view._init();
	},
	/**
	 * Handles view extraction logic
	 */
	view: {
		/**
		 * View entry point
		 */
		_init: function () {
			// call when quiescent
			browser.runtime.onMessage.addListener(() => {
				return FE.connect._waitForQuiescence({ idleMs: 800, timeoutMs: 25000 }).then(async () => {
					// run scroll to bottom to capture lazy loaded content
					FE.view._scrollToBottom();
					// stall a bit just in case
					await new Promise((res) => setTimeout(res, 500));
					// extract experience data
					const extractionResult = FE.view._runExtraction();
					return { response: extractionResult };
				});
			});
		},
		/**
		 * Utility to get document height
		 * @returns float the document height
		 */
		_getDocHeight: function () {
			return Math.max(
				document.body.scrollHeight,
				document.documentElement.scrollHeight,
				document.body.offsetHeight,
				document.documentElement.offsetHeight,
				document.body.clientHeight,
				document.documentElement.clientHeight
			);
		},
		/**
		 * Scroll to bottom of page
		 */
		_scrollToBottom: function () { window.scrollTo(0, FE.view._getDocHeight()); },
		/**
		 * Run the extraction logic
		 * @returns {work: Array} extracted work experience array
		 */
		_runExtraction: function () {
			const output = { work: [] };
			const items = document.querySelectorAll('.scaffold-finite-scroll__content > ul:nth-child(1) > li');
			if (items) {
				for (let index = 0; index < items.length; index++) {
					const item = items[index];

					let daterange = item.querySelector('.optional-action-target-wrapper span.t-14.t-normal.t-black--light span.visually-hidden')?.innerText.trim() || '';
					daterange = (daterange.split(' · ')[0] || '').split('to').map(s => s.trim());
					let temp = {
						name: item.querySelector('.optional-action-target-wrapper div.display-flex.align-items-center.mr1.hoverable-link-text.t-bold span.visually-hidden')?.innerText.trim() || null,
						position: item.querySelector('.optional-action-target-wrapper span.t-14.t-normal:not(.t-black--light) span.visually-hidden')?.innerText.trim() || null,
						url: null,
						startDate: daterange[0] || null,
						endDate: daterange[1] === 'Present' ? null : (daterange[1] || null),
						summary: [...item.querySelectorAll('div.pvs-entity__sub-components span.visually-hidden')].map(text => text.innerText.trim()).join("\r\n") || null,
					};
					temp.id = btoa(JSON.stringify(temp.name + temp.position));
					output.work.push(temp);

				}

				return output
			}
		}
	},
	/**
	 * Handles network connection quiescence detection
	 */
	connect: {
		/**
		 * Stored count of active requests
		 */
		activeRequests: 0,
		/**
		 * Entry point
		 */
		_init: function () {
			// track outstanding network requests with protoype overrides bc linkedin uses both fetch and XHR and takes forever to load sometimes
			const origFetch = window.fetch;
			if (origFetch) {
				window.fetch = function (...args) {
					FE.connect.activeRequests++;
					return origFetch.apply(this, args).finally(() => { FE.connect.activeRequests--; });
				};
			}
			if (window.XMLHttpRequest) {
				const XHR = window.XMLHttpRequest;
				const origSend = XHR.prototype.send;
				XHR.prototype.send = function (...args) {
					FE.connect.activeRequests++;
					this.addEventListener('readystatechange', function () {
						if (this.readyState === 4) FE.connect.activeRequests--;
					}, { once: true });
					return origSend.apply(this, args);
				};
			}
		},
		/**
		 * 
		 * @param {idleMs} int polling distance
		 * @param {timeoutMs} int max wait time
		 * @returns Promise that resolves when no active requests for idleMs or timeoutMs reached
		 */
		_waitForQuiescence: function ({ idleMs = 1000, timeoutMs = 20000 } = {}) {
			return new Promise(resolve => {
				let stableTimer;
				const observer = new MutationObserver(() => {
					clearTimeout(stableTimer);
					stableTimer = setTimeout(check, idleMs);
				});
				function check() {
					if (FE.connect.activeRequests === 0) {
						observer.disconnect();
						clearTimeout(timeoutTimer);
						resolve();
					} else {
						stableTimer = setTimeout(check, idleMs);
					}
				}
				observer.observe(document.documentElement || document.body, {
					childList: true,
					subtree: true,
					attributes: true,
					characterData: true
				});
				stableTimer = setTimeout(check, idleMs);
				const timeoutTimer = setTimeout(() => { observer.disconnect(); resolve(); }, timeoutMs);
			});
		}
	},
}

// let's go!
FE._init();
