
let chars = []
let animals = []
let selectedChars = new Set()
let spreadsheet = null

;(async function() {
	const res = await fetch('./data.json')
	const data = await res.json()
	animals = data.animals
	chars = [...new Set(
		data.animals
			.map(a => a.characteristics)
			.reduce((a, b) => a.concat(b), [])
	)].sort()

	function updateAnimals() {
		document.querySelector('.chars-list').childNodes.forEach(e => {
			e.classList.toggle('selected', selectedChars.has(e.textContent))
		})
		document.querySelector('.selected-list').innerHTML = ''
		;[...selectedChars].sort().forEach(c => {
			const div = document.createElement('div')
			const text = document.createElement('span')
			text.textContent = c
			const remove = document.createElement('div')
			remove.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill-rule="evenodd" d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"></path></svg>'
			remove.classList.add('remove')
			remove.addEventListener('click', () => {
				selectedChars.delete(c)
				updateAnimals()
			})
			div.append(remove)
			div.append(text)
			document.querySelector('.selected-list').append(div)
		})

		document.querySelector('.animals-list').scrollTo({ top: 0, behavior: 'smooth' })
		document.querySelector('.animals-list').innerHTML = ''
		const results = animals.map(a => {
				const matches = a.characteristics.filter(e => selectedChars.has(e))
				const score = matches.length / a.characteristics.length
				return { ...a, matches, score }
			})
		const maxScore = Math.max(...results.map(a => a.score))
		results
			.filter(a => a.score > 0 || maxScore === 0)
			.sort((a, b) => b.score - a.score)
			.forEach(a => {
				const color = lerpColor([210, 40, 20], [190, 170, 20], [120, 220, 70], a.score / maxScore)
				document.querySelector('.animals-list').insertAdjacentHTML('beforeend', `
					<div class="animal">
						${maxScore > 0 ? `<div class="animal-score" style="color: ${color}">${(a.score * 100).toFixed()}</div>` : ''}
						<h2>${a.name}</h2>
						${a.synonyms ? `<h3>${a.synonyms.join(', ')}</h3>` : ''}
						<h4>${a.characteristics.map(c => selectedChars.has(c) ? `<span class="selected">${c}</span>` : c).join(' · ')}</h4>
						<p>${a.description}</p>
					</div>
				`)
			})
		document.querySelector('.animals-list').insertAdjacentHTML('beforeend', `<div class="space">`)
	}
	updateAnimals()

	chars.forEach(c => {
		const div = document.createElement('div')
		div.addEventListener('click', () => {
			if (selectedChars.has(c)) {
				selectedChars.delete(c)
			} else {
				selectedChars.add(c)
			}
			updateAnimals()
		})
		div.textContent = c
		document.querySelector('.chars-list').append(div)
	})

	function normalize(str) {
		return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
	}

	const charsFilter = document.querySelector('.chars-filter')
	charsFilter.addEventListener('keyup', () => {
		const results = chars.filter(e => normalize(e).includes(normalize(charsFilter.value)))
		document.querySelector('.chars-list').childNodes.forEach(e => {
			e.classList.toggle('hidden', !results.includes(e.textContent))
		})
	})

	document.querySelector('.mobile-toggle').addEventListener('click', () => {
		if (document.body.getAttribute('data-panel') === 'chars') {
			document.body.setAttribute('data-panel', 'animals')
		} else {
			document.body.setAttribute('data-panel', 'chars')
		}
	})

	let apiKey = localStorage.getItem('totem_api_key')
	let clientId = localStorage.getItem('totem_client_id')
	let spreadsheetId = localStorage.getItem('totem_spreadsheet_id')
	const modal = document.querySelector('.modal')
	const modalApiKey = modal.querySelector('.modal-api-key')
	const modalClientId = modal.querySelector('.modal-client-id')
	const modalSpreadsheetId = modal.querySelector('.modal-spreadsheet-id')
	const modalButton = modal.querySelector('button')
	if (apiKey && clientId && spreadsheetId) {
		gapi.load('client', () => {
			loadSpreadsheet()
		})
	} else {
		showModal()
	}

	function showModal() {
		modal.classList.add('visible')
		gapi.load('client', () => {
			 modalButton.addEventListener('click', () => {
				modal.querySelectorAll('input.modal-error')
					.forEach(e => e.classList.remove('modal-error'))
					apiKey = modalApiKey.value
					clientId = modalClientId.value
					spreadsheetId = modalSpreadsheetId.value
					loadSpreadsheet()
			})
		})
	}

	function loadSpreadsheet() {
		gapi.client.init({
			apiKey: apiKey,
			clientId: `${clientId}.apps.googleusercontent.com`,
			scope: 'profile',
		})
		.then(() => {
			return gapi.client.request({
				path: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`
			})
		})
		.then((response) => {
			modal.classList.remove('visible')
			spreadsheet = response.result
			console.log(spreadsheet)
			localStorage.setItem('totem_api_key', apiKey)
			localStorage.setItem('totem_client_id', clientId)
			localStorage.setItem('totem_spreadsheet_id', spreadsheetId)
		}, (reason) => {
			modal.classList.add('visible')
			const errorSpan = modal.querySelector('.modal-error')
			if (reason.error === 'idpiframe_initialization_failed') {
				modalClientId.classList.add('modal-error')
				errorSpan.textContent = 'Ongeldige Client ID'
			} else if (reason.result && reason.result.error && (reason.result.error.message === 'The request is missing a valid API key.' || (reason.result.error.details && reason.result.error.details[0] && reason.result.error.details[0].reason === 'API_KEY_INVALID'))) {
				modalApiKey.classList.add('modal-error')
				errorSpan.textContent = 'Ongeldige API Key'
			} else if (reason.result && reason.result.error && reason.result.error.status === 'NOT_FOUND') {
				errorSpan.textContent = 'Ongeldige Document ID'
			} else {
				errorSpan.textContent = 'Onbekende error'
				console.error(reason)
			}
		});
	}
})()

function lerpColor(a, b, c, d) {
	let res = [0, 0, 0]
	for (let i = 0; i < 3; i += 1) {
		res[i] = d < 0.5
		  ? Math.round(a[i] + (b[i] - a[i]) * d)
			: Math.round(b[i] + (c[i] - b[i]) * (d - 0.5))
	}
	return `rgb(${res[0]}, ${res[1]}, ${res[2]})`
}
