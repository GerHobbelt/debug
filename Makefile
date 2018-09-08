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

dist/debug.js: src/*.js 
	@mkdir -p dist
	@node_modules/.bin/browserify \
		--standalone debug \
		. > dist/debug.js

lint:
	@eslint *.js src/*.js

fix:
	@eslint --fix *.js src/*.js

test-node:
	node_modules/.bin/nyc --all node_modules/mocha/bin/_mocha -- test/**.js

test-browser:
	@make browser
	@karma start --single-run

test-all:
	@concurrently \
		"make test-node" \
		"make test-browser"

test:
	@if [ "x$(BROWSER)" = "x" ]; then \
		make test-node; \
		else \
		make test-browser; \
	fi

clean:
	rimraf dist coverage

.PHONY: browser install clean lint test test-all test-node test-browser all
