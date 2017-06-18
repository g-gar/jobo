const conf = require('./scripts/conf.js')
const remote = require('electron').remote
const Queue = require('./scripts/Queue.js')

const q = new Queue()
const indeed_columns = 'jobkey,jobtitle,company,url,formattedLocation,date'.split(',')
const infojobs_cols = 'id,author,title,link,province,published,updated'.split(',')
const infojobs_cols_objects = {
	'author': 'name',
	'province': 'value'
}
const Priority = {
	'p0': 0,
	'p1': 10,
	'p2': 100,
	'p3': 1000,
	'p4': 10000
}

function AsyncFor(i, step, max, callback, priority=Priority.p2){
	let terminate = false
	let interval = setInterval(()=>{
		if (i >= max || terminate) clearInterval(interval)
		else terminate = !!callback(i)
		i += step
	}, priority)
}
function filter(queuElement){
	function ms2d(ms){return Math.round(ms / (1000*60*60*24))}
	let days = ms2d(new Date().getTime() - new Date(queuElement["date"]).getTime())
	return ( days <= 1 || 1) ? true : false
}
function formatInt(num, length=2) { return (num / Math.pow(10, length)).toFixed(length).substr(2)}
function toRFC3339(date){
	date = new Date(date.getTime() + date.getTimezoneOffset()/60 * 60 * 60 * 1000)
	console.log(date)
	return (date) ? `${date.getFullYear()}-${formatInt(date.getMonth()+1,2)}-${formatInt(date.getDate(),2)}T${formatInt(date.getHours(),2)}:${formatInt(date.getMinutes(),2)}:${formatInt(date.getSeconds(),2)}Z` : false}
function clearTable(table_id){let table = document.getElementById(table_id); if (!table) return false; while (table.firstChild) table.removeChild(table.firstChild)}
function ms2d(ms){return ms / (1000*60*60*24)}

function addToTable(result) {
	let tablebody = document.getElementById('t01').getElementsByTagName('tbody')[0]
	let index = tablebody.children.length
	let str = `<tr><td>${index + 1}</td>`
	indeed_columns.map(e=>{
		str += `<td>${result[e]}</td>`
	})
	str += "</tr>"
	tablebody.innerHTML += str
}
function addHeader(table_id, column_array){
	let table = document.getElementById(table_id)
	if (!table) return false
	let tableHeader = table.getElementsByTagName('thead')[0]
	tableHeader.innerHTML = `<tr><th>${column_array.join('</th><th>')}</th></tr>`
}

function request(url, callback){
	require(url.split('://')[0]).get(url, (res)=>{
		let m = ''
		res.setEncoding('utf8')
		res.on('data', d=>{ m += d })
		res.on('end', ()=>{ callback(JSON.parse(m)) })
	})
}
function indeed(terms){
	terms = (terms.split(' ').length == 1) ? terms : `%28${terms.replace(/\s{1,}/g, ' ').split(' ').join('+or+')}%29`
	let _url = `http://api.indeed.com/ads/apisearch?publisher=${conf.indeed.clientID}&q=${terms}&sort=date&start=_i&limit=_j&fromage=_k&co=es&format=json&v=2`
	.replace('_k', ms2d( new Date(document.getElementById('i03').value).getTime() - new Date(document.getElementById('i02').value).getTime() ))
	let limit = 25
	addHeader('t01', ['No'].concat(indeed_columns))
	request(_url.replace('_i', 0), (json)=>{
		for (let i = 0; i <= json.totalResults; i += limit){
			let subquery = _url.replace('_i', i).replace('_j', limit)
			request(subquery, (json2)=>{
				for (let j = 0; j < json2.results.length; j++){
					if (filter(json2.results[j])) q.enqueue(json2.results[j])
				}
				if (q.size() == json.totalResults) {
					AsyncFor (0, 1, q.size(), j=>{
						let max = null
						for (let j = 0; j < q.size(); j++) {
			    			if (max == null) max = j
			    			else if ((q.get(j) != null && new Date(q.get(j)["date"]).getTime() > new Date(q.get(max)["date"]).getTime())) max = j
				    			else break
				    	}
				    	if (max != null && q.get(max) != null) {
				    		document.title = `Cargando oferta ${j + 1} de ${json.totalResults}`
				    		addToTable(q.removeAt(max))
				    	}
				    	return (q.size() == 0) ? true : false
					}, 250)
				}
			})
		}
	})
}
function infojobs(terms){
	stopExecution = true
	terms = terms.trim().split(/\s{1,}/g)
	terms = ((terms.length > 1)?'(':'') + terms.join('%20') + ((terms.length > 1)?')':'')
	let path = `/api/1/offer?q=${terms}`
	path = `${path}&publishedMin=${toRFC3339(new Date(`${document.getElementById('i02').value}T00:00:00Z`))}`
	path = `${path}&publishedMax=${toRFC3339(new Date(`${document.getElementById('i03').value}T23:59:59Z`))}`
	path = `${path}&order=updated-desc&maxResults=1000000&country=espana`
	let secret = new Buffer(`${conf.infojobs.clientID}:${conf.infojobs.clientSecret}`).toString('base64')
	require('https').get({
		host: 'api.infojobs.net',
		path: path,
		protocol: 'https:',
		method: 'GET',
		headers: {
			'content-type' : 'application/json',
			'Authorization' : `Basic ${secret}`
		}
	}, (res)=>{
		let m = ''
		res.setEncoding('utf8')
		res.on('data', d=>{ m += d })
		res.on('end', ()=>{
			let json = JSON.parse(m)
			addHeader('t01', ['No'].concat(infojobs_cols))
			let tablebody = document.getElementById('t01').getElementsByTagName('tbody')[0]

			stopExecution = false

			AsyncFor(0, 1, json.offers.length, i=>{
				let result = json.offers[i]
				if (!stopExecution) {
					document.title = `Cargando oferta ${i + 1} de ${json.offers.length}`
					let str = `<tr><td>${i + 1}</td>`
					infojobs_cols.map(e=>{
						str += `<td>${(result[e].constructor.name !== 'Object') ? result[e] : result[e][infojobs_cols_objects[e]]}</td>`
					})
					tablebody.innerHTML += str + "</tr>"
				}
				return stopExecution
			}, 250)
		})
	})
}

function start(){
	q.clear()
	if (table.children[1].children.length >= 0) {
		table.removeChild(table.children[1])
		table.innerHTML += '<tbody></tbody>'
	}
	switch(select.selectedOptions[0].value){
		case 'indeed': indeed(input.value); break;
		case 'infojobs': infojobs(input.value); break;
	}
}
let table = document.getElementById('t01')
let select = document.getElementById('s01')
let input = document.getElementById('i01')
let button = document.getElementById('b01')

let stopExecution = false

window.onload = ()=>{
	document.title = 'Jobo'
	let x = new Date()
	document.getElementById('i03').value = `${x.getFullYear()}-${formatInt(x.getMonth()+1)}-${formatInt(x.getDate())}`
	x = new Date(x.getTime() - 1 * 60 * 60 * 1000)
	document.getElementById('i02').value = `${x.getFullYear()}-${formatInt(x.getMonth()+1)}-${formatInt((x.getDate()))}`

	input.value = 'docente,formador,profesor,monitor,tutor,educador'.split(',').join(' ')
	start()

	button.onmousedown = (event)=>{ 
		if (event.which == 1) {
			start()
		}
	}
	input.onkeyup = (event)=>{ if (event.key == 'Enter') start() }
	table.onmouseup = (event)=>{
		if (event.which == 3) {
			event.target.style.background = '#66bb6a'
			remote.clipboard.writeText(event.target.innerText)
			let div = document.createElement('div')
			div.innerText = `Copiado al portapapeles:\n${event.target.innerText}`
			div.id = 'messageBox'
			document.body.appendChild(div)
			setTimeout(()=>{
				document.body.removeChild(div)
			}, 2000)
		} else if (event.which == 1 && event.target.nodeName.toLowerCase() == 'td') {
			if (/^http/.test(event.target.innerText)) {
				event.target.style.color = 'green'
				new remote.BrowserWindow().loadURL(event.target.innerText)
			}
		}
	}
}