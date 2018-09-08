# get Makefile directory name: http://stackoverflow.com/a/5982798/376773
THIS_MAKEFILE_PATH:=$(word $(words $(MAKEFILE_LIST)),$(MAKEFILE_LIST))
THIS_DIR:=$(shell cd $(dir $(THIS_MAKEFILE_PATH));pwd)

# BIN directory
BIN := node_modules/.bin

# Path
PATH := node_modules/.bin:$(PATH)
SHELL := bash

# applications
NODE = node
PKG = npm
BROWSERIFY = $(BIN)/browserify

all: lint browser test-node

install: node_modules

browser: dist/debug.js

node_modules: package.json
	@NODE_ENV= $(PKG) install
	@touch node_modules

dist/debug.js: src/*.js package.json
	@echo "Compile dist/debug.js" 
	@mkdir -p dist
	@node_modules/.bin/browserify \
		--standalone debug \
		. > dist/debug.js

lint:
	@eslint *.js src/*.js

fix:
	@eslint --fix *.js src/*.js

test-node:
	nyc mocha -- test/**.js

test-browser: browser
	@karma start --single-run

test-all: test-node test-all

test: test-node

clean:
	rimraf dist coverage

.PHONY: browser install clean lint test test-all test-node test-browser all
