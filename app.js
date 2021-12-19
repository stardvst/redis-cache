import express from 'express';
import fetch from 'node-fetch';
import { createClient } from 'redis';

const PORT = process.env.PORT || 5000;
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const app = express();
const client = createClient(REDIS_PORT);

(async () => {
  client.on('error', err => console.log('Redis Client Error', err));
  await client.connect();
})();

const setResponse = (username, repos) => {
  return `<h2>${username} has ${repos} Github repos.</h2>`;
};

const cache = async (req, res, next) => {
  try {
    const { username } = req.params;
    const data = await client.get(username);
    if (data) {
      res.send(setResponse(username, data));
    } else {
      next();
    }
  } catch (error) {
    console.error(error);
    res.status(500);
  }
};

const getRepos = async (req, res) => {
  try {
    console.log('Fetching data');
    const { username } = req.params;
    const response = await fetch(`https://api.github.com/users/${username}`);
    const data = await response.json();
    const repos = data.public_repos;

    // set data to redis
    await client.set(username, repos, { EX: 3600 });

    res.send(setResponse(username, repos));
  } catch (error) {
    console.error(error);
    res.status(500);
  }
};

app.get('/repos/:username', cache, getRepos);

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
