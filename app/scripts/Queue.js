class Queue {
	constructor(callback){this.stack = new Array()}
	size(){ return this.stack.length }
	isEmpty(){ return (this.size() == 0) ? true : false }
	enqueue(element){ this.stack.push(element) }
	dequeue(){ return (!this.isEmpty()) ? this.stack.shift() : false }
	dequeueAll(callback=new Function()){ this.stack.map(()=>{callback(this.dequeue())}) }
	dequeueAllAsync(callback){
		let interval = setInterval(async ()=>{
			if (this.size() > 0) callback(this.dequeue()); 
			else clearInterval(interval)
		}
	)}
	get(index){ return (!this.isEmpty() && index < this.size() && index >= 0 && this.stack[index] != null) ? this.stack[index] : null }
	front(){return this.get(0)}
	clear(){ this.stack = new Array() }
	concat(separator=','){return this.stack.join(separator)}
	execute(index, callback){callback(this.get(index))}
	executeAll(callback){this.stack.map((e)=>{callback(e)})}
	executeAllAsync(callback){
		let counter = this.size()
		let interval = setInterval(()=>{
			if (counter == 0) clearInterval(interval)
			else callback(this.get(this.size() - counter--))
		})
	}
	remove(element){ return this.stack.splice(this.stack.indexOf(element), 1) }
	removeAt(position){ return this.stack.splice(position, 1)[0] }
}

module.exports = Queue