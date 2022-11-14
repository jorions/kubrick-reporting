# Kubrick Report

This is a simple script which will query the Kubrick API to fetch all time entries for a given client and date range, and the both log the results to the console and save the results to a .csv in the `reports/` folder.

# First-Time Setup

1. `npm i`
2. Copy `.env.sample` and create new file `.env`. Populate `.env` with auth token (see `Auth Token` section).

# Auth Token

You must populate the `.env` with an `AUTH_TOKEN`. You can retrieve this by logging into Kubrick, opening the devtools, and then loading any page. In the `Network` tab of the devtools you will see the request headers, which will include an `authorization` key. Copy the contents of this key into the `.env` as the `AUTH_TOKEN`.

# CLI

The most basic usage is simply `npm run report 'Some Client'`

- If the client name is one word you do not need to wrap it in `''`
- Given that this does not specify a start or end date the report automatically runs for the prior 7 days

You can also specify a start date: `npm run report 'Some Client' YYYY-MM-DD`

- The end date will automatically be set as the end of the day before the current day

You can also specify both a start and end date: `npm run report 'Some Client' YYYY-MM-DD YYYY-MM-DD`
