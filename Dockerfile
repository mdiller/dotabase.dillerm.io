FROM node:22

# dotabase.db.sql is stored via Git LFS in the dotabase repo, which server.js
# clones at runtime (see src/dotabase-worker.js) — without git-lfs installed,
# that clone only fetches the LFS pointer stub instead of the real file.
RUN apt-get update && apt-get install -y git-lfs && git lfs install --skip-repo

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

CMD [ "npm", "run", "prod" ]
