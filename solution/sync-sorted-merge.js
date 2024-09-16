"use strict";

const { MinPriorityQueue } = require("@datastructures-js/priority-queue");

module.exports = (logSources, printer) => {
  // Enforce consistent ordering for duplicate timestamps
  let sourceId = 0;
  let jitter = 1e-3

  // Initialize the priority queue with a comparator that considers date and sourceId
  const queue = new MinPriorityQueue((node) => {
    return node.entry.date.getTime() + node.sourceId * jitter;
  });

  // Initialize the priority queue with the first entry from each source
  logSources.forEach((source) => {
    try {
      const entry = source.pop();
      if (entry && entry.date <= new Date()) {
        queue.enqueue({ entry, source, sourceId: sourceId++ });
      } else if (entry && entry.date > new Date()) {
        console.warn('Skipping future-dated entry:', entry);
      }
    } catch (error) {
      console.error(`Error fetching from source: ${error.message}`);
    }
  });

  // Merge the log entries
  while (!queue.isEmpty()) {
    const { entry, source, sourceId } = queue.dequeue();

    try {
      printer.print(entry);
    } catch (error) {
      console.error('Error printing entry:', error.message);
    }

    try {
      const nextEntry = source.pop();
      if (nextEntry && nextEntry.date <= new Date()) {
        queue.enqueue({ entry: nextEntry, source, sourceId });
      } else if (nextEntry && nextEntry.date > new Date()) {
        console.warn('Skipping future-dated entry:', nextEntry);
      }
    } catch (error) {
      console.error(`Error fetching from source: ${error.message}`);
    }
  }

  printer.done();
};
