const lib = require('./scripts/lib.js')
const conf = require('./scripts/conf.js')
const remote = require('electron').remote
const Queue = require('./scripts/Queue.js')

const q = new Queue()
const indeed_columns = 'jobkey,jobtitle,company,url,formattedLocation,date'.split(',')
const infojobs_cols = 'No,id,author,title,province,link,published,updated'.split(',')
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
function toRFC3339(date){return (date) ? `${date.getFullYear()}-${formatInt(date.getMonth()+1,2)}-${formatInt(date.getDate(),2)}T${formatInt(date.getHours(),2)}:${formatInt(date.getMinutes(),2)}:${formatInt(date.getSeconds(), 2)}Z` : false}
function clearTable(table_id){let table = document.getElementById(table_id); if (!table) return false; while (table.firstChild) table.removeChild(table.firstChild)}
function ms2d(ms){return ms / (1000*60*60*24)}

function addToTable(result) {
	let tablebody = document.getElementById('t01').getElementsByTagName('tbody')[0]
	let index = tablebody.children.length
	let str = `<tr><td>${index + 1}</td>`
	for (let key in result) if (indeed_columns.indexOf(key) >= 0) str += `<td>${result[key]}</td>`
	str += "</tr>"
	tablebody.innerHTML += str
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
	request(_url.replace('_i', 0), (json)=>{
			// let interval = setInterval(()=>{
			// 	AsyncFor(0, limit, json.totalResults, i=>{
			// 	max = 1
			// 	let subquery = _url.replace('_i', i).replace('_j', limit)
			// 	console.log(subquery)
			// 	request(subquery, (json2)=>{
			// 		AsyncFor(0, 1, json2.results.length, i=>{
			// 			if (filter(json2.results[i])) q.enqueue(json2.results[i])
			// 			return q.size() == 0 || stopExecution
			// 		})				
			// 	})
			// 	return stopExecution
			// }, Priority.p0)
	  //   	if (q.size() == 0) clearInterval(interval)
	  //   	else {
	  //   		let max = null
		 //    	for (let i = 0; i < q.size(); i++) {
		 //    		if (!max || (q.get(i) != null && new Date(q.get(i)["date"]).getTime() > new Date(q.get(max)["date"]).getTime())) max = i
		 //    		if (q.size() == 0 || stopExecution) break
		 //    	}
		 //    	if ((max != null || q.size() > 0) && !stopExecution) addToTable(q.removeAt(max))
	  //   	}
	  //   }, Priority.p1)
		for (let i = 0; i <= json.totalResults; i += limit){
			let subquery = _url.replace('_i', i).replace('_j', limit)
			request(subquery, (json2)=>{
				for (let j = 0; j < json2.results.length; j++){
					if (filter(json2.results[j])) q.enqueue(json2.results[j])
				}
				if (q.size() == json.totalResults) {
					AsyncFor (0, 1, q.size(), i=>{
						let max = null
						for (let i = 0; i < q.size(); i++) {
				    		if (!max || (q.get(i) != null && new Date(q.get(i)["date"]).getTime() > new Date(q.get(max)["date"]).getTime())) max = i
				    		if (q.size() == 0 || stopExecution) break
				    	}
				    	if ((max != null || q.size() > 0) || !stopExecution) {
				    		document.title = `Cargando oferta ${table.children[1].children.length + 1} de ${json.totalResults}`
				    		addToTable(q.removeAt(max))
				    	}
				    	return stopExecution
					})
				}
			})
		}
	})
}
function infojobs(terms){
	terms = terms.trim().split(/\s{1,}/g)
	terms = ((terms.length > 1)?'(':'') + terms.join('%20') + ((terms.length > 1)?')':'')
	let path = `/api/1/offer?q=${terms}`
	path = `${path}&publishedMin=${toRFC3339(new Date(document.getElementById('i02').value))}`
	path = `${path}&publishedMax=${toRFC3339(new Date(`${document.getElementById('i03').value}T15:00:00Z`))}`
	path = `${path}&order=updated-desc&maxResults=1000000&country=espana`
	console.log(path)
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
			let tablebody = document.getElementById('t01').getElementsByTagName('tbody')[0]
			AsyncFor(0, 1, json.offers.length, i=>{
				let index = tablebody.children.length || 0
				let result = json.offers[i]
				document.title = `Cargando oferta ${index + 1} de ${json.offers.length}`
				let str = `<tr>`
				let data = new Array(infojobs_cols.length).fill('')
				data[0] = `<td>${index + 1}</td>`
				for (let key in result) 
					if (infojobs_cols.indexOf(key) >= 0) 
						data[infojobs_cols.indexOf(key)] = '<td>' + ((result[key].constructor.name != 'Object') ? result[key] : result[key][infojobs_cols_objects[key]]) + '</td>'
				str += data.join('') + "</tr>"
				tablebody.innerHTML += str
				return (stopExecution) ? true : false
			}, Priority.p0)
		})
	})
}

function start(){
	q.dequeueAll()
	stopExecution = true
	if (table.children[0].children.length >= 0) {
		table.removeChild(table.children[1])
		table.innerHTML += '<tbody></tbody>'
	}
	stopExecution = false
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
	//start()

	button.onmousedown = (event)=>{ if (event.which == 1) start() }
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