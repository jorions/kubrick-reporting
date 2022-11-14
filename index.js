import dotenv from 'dotenv';
import axios from 'axios';
import moment from 'moment';
import fs from 'fs';
import path from 'path';
import { EOL } from 'os';

const {
  promises: { writeFile },
} = fs;

dotenv.config();

const fetch = body =>
  axios
    .post('https://api.kubrick.moove-it.com/graphql', body, {
      headers: {
        authority: 'api.kubrick.moove-it.com',
        accept: '*/*',
        authorization: process.env.AUTH_TOKEN,
        'content-type': 'application/json',
      },
    })
    .then(({ data }) => data.data);

const fetchClients = () =>
  fetch({
    query: `{
      clients {
        name
        id
      }
    }`,
  }).then(({ clients }) => clients);

const fetchUsers = () =>
  fetch({
    query: `{
      users {
        name
        id
      }
    }`,
  }).then(({ users }) => users);

const fetchReport = async ({ startDate, endDate, clientId, users, clientName }) => {
  const { timeEntriesReportPaginated } = await fetch({
    operationName: 'TimeEntriesReport',
    query: `query TimeEntriesReport($input: ReportTimeEntryPaginatedInput!) {
      timeEntriesReportPaginated(input: $input) {
        timeEntries {
          userId
          project {
            name
          }
          description
          tagId
          billable
          startedAt
          finishedAt
          duration
        }
      }
    }`,
    variables: {
      input: {
        filter: {
          userIds: null,
          clientIds: [clientId],
          projectIds: null,
          tagIds: null,
          description: null,
          from: moment(startDate, 'YYYY-MM-DD').startOf('day').toISOString(),
          to: moment(endDate, 'YYYY-MM-DD').endOf('day').toISOString(),
        },
        skip: 0,
        take: 1000,
        sortAttribute: 'started_at',
        sortDirection: 'ASC',
      },
    },
  });

  const tagIdToTag = {
    1: '1 - Communication/Management',
    2: '2 - Development',
    3: '3 - Development (bug)',
    4: '4 - Development (code review)',
    5: '5 - QA',
    6: '6 - Infrastructure',
    7: '7 - UX/UI',
  };

  const userIdToName = Object.fromEntries(users.map(({ id, name }) => [id, name]));

  return timeEntriesReportPaginated.timeEntries.map(
    ({
      userId,
      project: { name: projectName },
      description,
      tagId,
      billable,
      startedAt,
      finishedAt,
      duration,
    }) => ({
      User: userIdToName[userId],
      Client: clientName,
      Project: projectName,
      Description: description,
      Tag: tagIdToTag[tagId] || '',
      'Billable?': billable ? 'Yes' : 'No',
      'Start Date': moment(startedAt).format('YYYY-MM-DD'),
      Start: startedAt,
      Finish: finishedAt,
      'Duration In Hours': Number((duration / 60 / 60).toFixed(2)),
    }),
  );
};

const createFile = async ({ clientName, report }) => {
  const filePath = await path.join(
    process.cwd(),
    'reports',
    `${clientName.replace(/\s+/g, '-')}_${moment().format('YYYYMMDD-HHmmss')}.csv`,
  );

  const cleanedReport = report.map(entry =>
    Object.fromEntries(
      Object.entries(entry).map(([key, val]) => [
        key,
        typeof val === 'string' ? val.replace(/,/g, '') : val,
      ]),
    ),
  );

  const headers = Object.keys(cleanedReport[0]);

  const content = [headers, ...cleanedReport.map(entry => headers.map(field => entry[field]))]
    .map(fields => fields.join(','))
    .join(EOL);

  await writeFile(filePath, content);

  return { content, filePath };
};

const run = async () => {
  const [, , clientName, givenStartDate, givenEndDate] = process.argv;

  const [clients, users] = await Promise.all([fetchClients(), fetchUsers()]);

  const selectedClient = clients.find(({ name }) => name === clientName);

  if (!selectedClient) {
    console.log(
      `Uh oh! Invalid client '${clientName}' provided. Available options are:\n` +
        `${clients.map(({ name }) => name).join('\n')}`,
    );
    return;
  }

  const startDate =
    givenStartDate || moment().subtract(7, 'days').startOf('day').format('YYYY-MM-DD');
  const endDate = givenEndDate || moment().subtract(1, 'days').endOf('day').format('YYYY-MM-DD');

  if (!givenStartDate && !givenEndDate)
    console.log(`No start or end date given. Using date range ${startDate} to ${endDate}.`);
  else if (!givenStartDate)
    console.log(`No start date given. Using date range ${startDate} to ${endDate}.`);
  else if (!givenEndDate)
    console.log(`No end date given. Using date range ${startDate} to ${endDate}.`);
  else console.log(`Using date range ${startDate} to ${endDate}.`);

  const report = await fetchReport({
    startDate,
    endDate,
    clientId: selectedClient.id,
    users,
    clientName,
  });

  if (!report.length) {
    console.log('\nNo results found. Exiting.');
    return;
  }

  const { content, filePath } = await createFile({ clientName, report });

  console.log(`\nFile created!\n\n${content}\n\nSaved to ${filePath}`);
};

run();
