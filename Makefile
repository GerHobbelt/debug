# get Makefile directory name: http://stackoverflow.com/a/5982798/376773
THIS_MAKEFILE_PATH:=$(word $(words $(MAKEFILE_LIST)),$(MAKEFILE_LIST))
THIS_DIR:=$(shell cd $(dir $(THIS_MAKEFILE_PATH));pwd)

# BIN directory
BIN := node_modules/.bin

# Path
export PATH := $(THIS_DIR)/node_modules/.bin:$(PATH)
SHELL := bash

# applications
NODE = node
PKG = npm

all: dist test

dist: dist/debug.js dist/test.js

install: node_modules

browser: dist

node_modules: package.json
	@NODE_ENV= $(PKG) install
	@touch node_modules

.INTERMEDIATE: dist/debug.es6.js
dist/debug.es6.js: src/*.js
	@echo "Compile dist/debug.es6.js" 
	@mkdir -p dist
	browserify --standalone debug . > $@

dist/debug.js: dist/debug.es6.js
	@echo "Compile dist/debug.js" 
	@mkdir -p dist
	babel $< > $@

dist/test.js: test.js
	@mkdir -p dist
	babel $< > $@

lint:
	xo

fix:
	xo --fix

test-node:
	nyc mocha -- test.js

test-browser: browser
	@karma start --single-run

test: test-node test-browser

clean:
	rimraf dist coverage

.PHONY: browser install clean lint test fix dist test-node test-browser all node_modules
