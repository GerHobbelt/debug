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

all: test

install: node_modules

node_modules: package.json
	@NODE_ENV= $(PKG) install
	@touch node_modules

lint:
	xo

fix:
	xo --fix

test-node:
	nyc mocha -- test.js

test-browser:
	@karma start --single-run

test: test-node test-browser

clean:
	rimraf coverage

.PHONY: install clean lint test fix test-node test-browser all node_modules
