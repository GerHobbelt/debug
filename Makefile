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
BABEL = $(BIN)/babel
BROWSERIFY = $(BIN)/browserify

all: lint test

dist: dist/debug.js dist/test.js

install: node_modules

browser: dist/debug.js

node_modules: package.json
	@NODE_ENV= $(PKG) install
	@touch node_modules

.INTERMEDIATE: dist/debug.es6.js
dist/debug.es6.js: src/*.js
	@echo "Compile dist/debug.es6.js" 
	@mkdir -p dist
	$(BROWSERIFY) --standalone debug $< > $@

dist/debug.js: dist/debug.es6.js
	@echo "Compile dist/debug.js" 
	@mkdir -p dist
	$(BABEL) $< > $@

dist/test.js: test.js
	@mkdir -p dist
	$(BABEL) $< > $@

lint:
	xo

fix:
	xo --fix

test-node:
	nyc mocha -- test/**.js

test-browser: browser
	@karma start --single-run

test-all: test-node test-browser

test: test-node

clean:
	rimraf dist coverage

.PHONY: browser install clean lint test test-all test-node test-browser all
