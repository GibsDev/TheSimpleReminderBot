import { Sequelize } from '@sequelize/core';
import { SqliteDialect } from '@sequelize/sqlite3';
import Reminder from './Reminder.ts';

const sequelize = new Sequelize({
    dialect: SqliteDialect,
    schema: "public",
    storage: "data.db",
    models: [Reminder],
    define: {
        timestamps: true,
        underscored: true
    },
    // logging: console.log
});

await sequelize.sync();
