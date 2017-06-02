const _query = (options, callback)=>{
	let proto = (/^http:$/.test(options.protocol)) ? require('http') : (/^https:$/.test(options.protocol)) ? require('https') : null
	if (proto) proto.request(options, (response)=>{
		let str = ''
		response.on('data', (c)=>{str += c.toString()})
		response.on('end', ()=>{
			callback(JSON.parse(str))
		})
	}).end()
}

class InfoJobs {
	constructor(secret){
		this.options = {
			host: 'api.infojobs.net',
			path: '/api/1/offer',
			protocol: 'https:',
			method: 'GET',
			headers: {
				'content-type' : 'application/json',
				'Authorization' : `Basic ${secret}`
			}
		}
	}
	query(query, callback){
		this.options.path = query
		_query(this.options, callback)
	}
}

class Indeed{
	constructor(publisher_id){
		this.options = {
			host: 'api.indeed.com',
			protocol: 'http:',
			method: 'get',
			publisher_id: publisher_id,
			headers: {
				'content-type' : 'text/plain'
			}
		}
	}
	query(query, callback){
		this.options.path = `/ads/apisearch?publisher=${this.options.publisher_id}&q=${query}&format=json&v=2`
		_query(this.options, callback)
	}
}

module.exports = {
	InfoJobs: InfoJobs,
	Indeed: Indeed
}