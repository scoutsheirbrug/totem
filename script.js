
let chars = []
let animals = []
let selectedChars = new Set()

;(async function() {
	const res = await fetch('./data.json')
	const data = await res.json()
	animals = data.animals
	chars = [...new Set(
		data.animals
			.map(a => a.characteristics)
			.reduce((a, b) => a.concat(b), [])
	)].sort()

	function updateChars() {
		document.querySelector('.chars-list').childNodes.forEach(e => {
			e.classList.toggle('selected', selectedChars.has(e.textContent))
		})
		document.querySelector('.selected-chars-list').innerHTML = ''
		;[...selectedChars].sort().forEach(c => {
			const div = document.createElement('div')
			div.addEventListener('click', () => {
				selectedChars.delete(c)
				updateChars()
				updateAnimals()
			})
			div.textContent = c
			document.querySelector('.selected-chars-list').append(div)
		})
	}

	function updateAnimals() {
		document.querySelector('.animals-list').innerHTML = ''
		animals.map(a => {
				const matches = a.characteristics.filter(e => selectedChars.has(e))
				const score = matches.length / a.characteristics.length
				return { ...a, matches, score }
			})
			.sort((a, b) => b.score - a.score)
			.forEach(a => {
				document.querySelector('.animals-list').insertAdjacentHTML('beforeend', `
					<div class="animal">
						<h2>${a.name}</h2>
						<h3>${a.synonyms.join(', ')}</h3>
						<p>${a.description}</p>
					</div>
				`)
			})
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
			updateChars()
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
})()
