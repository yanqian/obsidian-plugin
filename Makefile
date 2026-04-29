SHELL := /bin/bash

.DEFAULT_GOAL := help

.PHONY: help install build dev smoke verify init clean

help:
	@printf "Available targets:\n"
	@printf "  make install  Install npm dependencies\n"
	@printf "  make build    Compile and bundle the plugin\n"
	@printf "  make dev      Start the esbuild development watcher\n"
	@printf "  make smoke    Run the smoke test\n"
	@printf "  make verify   Run all repository verification checks\n"
	@printf "  make init     Run the project init script\n"
	@printf "  make clean    Remove generated plugin build outputs\n"

install:
	npm install

build:
	npm run build

dev:
	npm run dev

smoke:
	npm run smoke

verify: init

init:
	./init.sh

clean:
	rm -f main.js
