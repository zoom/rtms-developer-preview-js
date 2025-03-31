# RTMS Beta Node.js Sample

!! INTERNAL CONFIDENTIAL !! 

This app is meant for RTMS Beta Testers only.

# Setup

The project will automatically clone the GitHub repo. Make sure that you have set up your SSH keys with GH.

```bash
 npm install github:zoom/rtms
 ```

**These next steps are temporary development steps**

Due to a known bug with NPM we will need to call a special function to make sure that the install hook is run

bug: https://stackoverflow.com/questions/18401606/npm-doesnt-install-module-dependencies

run the fetch script with this access token

```bash
npm run fetch -- your-token-goes-here
```

# Usage

Copy the .env.example to .env and fill it out

```bash
cp .env.example .env
```

Run the index.js file to test

```bash
npm start
```