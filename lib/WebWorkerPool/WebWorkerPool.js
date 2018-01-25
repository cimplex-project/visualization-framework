
/**
 * Implementation of a simple Thread pool, to bundle WebWorker creation
 * and to prevent too much WebWorker threads.
 *
 * use: var pool = new WebWorkerPool(numOfThreads)
 * then pool.executeTask(task)
 *
 * @param numOfThreads maximum amount of threads to use by our website
 * @returns function execute(task) expects a Task-Object
 */
WebWorkerPool = (function (numOfThreads) {
	const _this = this;

	this.taskQueue = [];
	this.workerPool = [];
	this.poolSize = numOfThreads;

	// runs a specified task
	this.executeTask = function (task) {
		if (_this.workerPool.length > 0) {
			const thread = _this.workerPool.shift();
			if (task.priority || _this.taskQueue.length === 0) {
				thread.run(task);
			} else {
				_this.taskQueue.push(task);
				thread.run(_this.taskQueue.shift());
			}
		} else {
			if (task.priority) {
				_this.taskQueue.unshift(task);
			}
			else {
				_this.taskQueue.push(task);
			}
		}
	};

	// stops a specified task
	this.stopTask = function (task) {
		if (task.thread) {
			task.thread.stop();
		}
		else {
			_this.dequeue(task);
		}
	};

	// removes a specified task from the queue
	this.dequeue = function (task) {
		const index = _this.taskQueue.indexOf(task);
		if (index > -1) {
			_this.taskQueue.splice(index, 1);
		}
	};

	// TODO: comment
	this.freeThread = function (thread) {
		if (_this.taskQueue.length > 0) {
			const task = _this.taskQueue.shift();
			thread.run(task);
		} else {
			_this.workerPool.push(thread);
		}
	};

	// constructs a new thread
	this.Thread = function () {
		const _thread = this;

		this.run = function (task) {
			_thread.task = task;
			task.thread = _thread;
			_thread._worker = new Worker(task.script);
			_thread._worker.addEventListener("message", _thread.endFunction, false);
			_thread._worker.postMessage(_thread.task.message);
		};

		this.stop = function () {
			_thread.task.thread = null;
			_thread._worker.terminate();
			_this.freeThread(_thread);
		};

		this.endFunction = function (event) {
			if (event.data.finished) { _thread.stop(); }

			_thread.task.callback(event);
		};
	};

	// creates as many new threads as specified in poolSize
	for (let i = 0; i < _this.poolSize; i++) {
		this.workerPool.push(new _this.Thread());
	};

	return {
		executeTask: this.executeTask,
		stopTask: this.stopTask
	};
});

/**
 * Returns a TaskObject to execute in the ThreadPool
 */
const Task = (function (scriptSrc, messageObj, callbackFunc, priority) {
	return {
		script: scriptSrc,
		message: messageObj,
		callback: callbackFunc,
		priority: priority ? true : false,
		thread: null
	};
});
