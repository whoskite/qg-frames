# Starting new work
git checkout master
git pull origin master          # Get latest master
git checkout -b feat/new-feature  # Create new branch

# Working on existing feature
git checkout feat/daily-login
git pull origin feat/daily-login  # Only if branch is shared/remote

# Updating feature branch with latest master
git checkout master
git pull origin master
git checkout feat/daily-login
git merge master               # Get latest master changes into your feature