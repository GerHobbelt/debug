
// DEBUG=* node example/worker
// DEBUG=worker:* node example/worker
// DEBUG=worker:a node example/worker
// DEBUG=worker:b node example/worker

const a = require('../..')('worker:a');

const b = require('../..')('worker:b');

function work() {
	a('doing lots of uninteresting work');
	setTimeout(work, Math.random() * 1000);
}

work();

function workb() {
	b('doing some work');
	setTimeout(workb, Math.random() * 2000);
}

workb();

setTimeout(() => {
	b(new Error('fail'));
}, 5000);
