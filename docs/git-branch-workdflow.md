# Git Branch Workflow Guide

## Table of Contents
1. [Basic Branch Structure](#basic-branch-structure)
2. [Creating and Managing Branches](#creating-and-managing-branches)
3. [Common Git Commands](#common-git-commands)
4. [Best Practices](#best-practices)

## Basic Branch Structure

### Master/Main Branch
- Primary branch containing stable, production-ready code
- Always should be working and deployable
- Base for creating new feature branches

### Feature Branches
- Used for developing new features
- Named descriptively (e.g., `feature/user-daily-login`)
- Created from master branch
- Multiple developers can work on different feature branches

### Bug Fix Branches
- Used for fixing issues
- Named descriptively (e.g., `fix/login-error` or `bugfix/payment-validation`)
- Created from master branch
- Can be worked on by multiple developers

## Creating and Managing Branches

### Starting a New Feature