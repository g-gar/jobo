const fs = require('fs')
const Infojobs = require('./lib.js').InfoJobs
const Indeed = require('./lib.js').Indeed
const conf = require('./conf.js')

const username = conf.username
const password = conf.password
const secret = new Buffer(username + ':' + password).toString('base64')

let ofertas = new Array()
let paginasTotales = 1
let paginaActual = 1

/*let ij = new Infojobs(secret)

ij.query('/api/1/offer', (x)=>{
	console.log(x)
	paginasTotales = parseInt(x.totalPages)
	for (let i = paginaActual; i <= paginasTotales; i++){
		ij.query(`/api/1/offer?page=${i}`, (y)=>{
			y.offers.map((offer)=>{
				ofertas.push(offer)
			})
			//if (i == paginasTotales) fs.writeFileSync('./files/ij_offers.txt', JSON.stringify(ofertas))
			console.log('num ofertas', ofertas.length)
		})
	}
})*/

let indeed = new Indeed('78573272417920')
indeed.query('q=a', (x)=>{
	console.log(x)
})

let ij = new Infojobs(secret)
ij.query('/api/1/offer?page=1', (x)=>{
	console.log(x)
})