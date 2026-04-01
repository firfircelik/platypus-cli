package watcher

import (
	"os"
	"path/filepath"
	"sync"
	"time"
)

type Event struct {
	Path string
	Op   string
	Time time.Time
}

type Watcher struct {
	mu        sync.RWMutex
	paths     map[string]bool
	interval  time.Duration
	callback  func(Event)
	stopCh    chan struct{}
	running   bool
	fileTimes map[string]time.Time
}

func NewWatcher(interval time.Duration, callback func(Event)) *Watcher {
	return &Watcher{
		paths:     make(map[string]bool),
		interval:  interval,
		callback:  callback,
		stopCh:    make(chan struct{}),
		fileTimes: make(map[string]time.Time),
	}
}

func (w *Watcher) Add(path string) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.paths[path] = true
	w.initFileTimes(path)
}

func (w *Watcher) Remove(path string) {
	w.mu.Lock()
	defer w.mu.Unlock()
	delete(w.paths, path)
}

func (w *Watcher) Start() {
	w.mu.Lock()
	if w.running {
		w.mu.Unlock()
		return
	}
	w.running = true
	w.mu.Unlock()

	go w.watchLoop()
}

func (w *Watcher) Stop() {
	w.mu.Lock()
	defer w.mu.Unlock()
	if !w.running {
		return
	}
	w.running = false
	close(w.stopCh)
	w.stopCh = make(chan struct{})
}

func (w *Watcher) watchLoop() {
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			w.checkChanges()
		case <-w.stopCh:
			return
		}
	}
}

func (w *Watcher) checkChanges() {
	w.mu.RLock()
	paths := make(map[string]bool)
	for p := range w.paths {
		paths[p] = true
	}
	w.mu.RUnlock()

	for path := range paths {
		filepath.Walk(path, func(p string, info os.FileInfo, err error) error {
			if err != nil || info.IsDir() {
				return nil
			}

			ext := filepath.Ext(p)
			if isIgnoredExt(ext) {
				return nil
			}

			w.mu.RLock()
			prevTime, exists := w.fileTimes[p]
			w.mu.RUnlock()

			modTime := info.ModTime()
			if !exists || modTime.After(prevTime) {
				if w.callback != nil {
					w.callback(Event{
						Path: p,
						Op:   "modified",
						Time: modTime,
					})
				}
				w.mu.Lock()
				w.fileTimes[p] = modTime
				w.mu.Unlock()
			}

			return nil
		})
	}
}

func (w *Watcher) initFileTimes(path string) {
	filepath.Walk(path, func(p string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}
		w.mu.Lock()
		w.fileTimes[p] = info.ModTime()
		w.mu.Unlock()
		return nil
	})
}

func isIgnoredExt(ext string) bool {
	ignored := map[string]bool{
		".log":      true,
		".tmp":      true,
		".swp":      true,
		".swo":      true,
		".DS_Store": true,
		".git":      true,
	}
	return ignored[ext]
}
