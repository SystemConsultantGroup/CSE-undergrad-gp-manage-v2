const Sequelize = require('sequelize');
const path = require('path');
const fs = require('fs');

// Create a test sequelize instance (mysql2 dialect, no actual connection needed for model definition)
const sequelize = new Sequelize('test', 'test', 'test', {
  dialect: 'mysql',
  logging: false,
});

function loadModelsFromDir(dir) {
  const models = {};
  const basename = 'index.js';

  fs.readdirSync(dir)
    .filter((file) => file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js')
    .forEach((file) => {
      const model = require(path.join(dir, file))(sequelize, Sequelize.DataTypes);
      models[model.name] = model;
    });

  Object.keys(models).forEach((modelName) => {
    if (models[modelName].associate) {
      models[modelName].associate(models);
    }
  });

  return models;
}

describe('cssys model definitions', () => {
  const modelsDir = path.join(__dirname, '../../models/cssys');
  let models;

  beforeAll(() => {
    models = loadModelsFromDir(modelsDir);
  });

  test('loads all expected models', () => {
    expect(Object.keys(models)).toEqual(expect.arrayContaining(['Board', 'BoardFile', 'BoardPost', 'User', 'UserLog']));
  });

  test('each model has a valid tableName', () => {
    Object.values(models).forEach((model) => {
      expect(model.tableName).toBeDefined();
      expect(typeof model.tableName).toBe('string');
    });
  });

  test('Board has association to BoardPost', () => {
    expect(models.Board.associations).toBeDefined();
    expect(models.Board.associations.BoardPosts).toBeDefined();
  });

  test('BoardPost belongs to Board and User', () => {
    expect(models.BoardPost.associations.Board).toBeDefined();
    expect(models.BoardPost.associations.User).toBeDefined();
  });

  test('User has many BoardPost and UserLog', () => {
    expect(models.User.associations.BoardPosts).toBeDefined();
    expect(models.User.associations.UserLogs).toBeDefined();
  });
});

describe('cssys_work model definitions', () => {
  const modelsDir = path.join(__dirname, '../../models/cssys_work');
  let models;

  beforeAll(() => {
    models = loadModelsFromDir(modelsDir);
  });

  test('loads all expected models', () => {
    expect(Object.keys(models)).toEqual(
      expect.arrayContaining([
        'Permission',
        'Prof',
        'ScheduleLog',
        'Student',
        'StudentFile',
        'StudentInfo',
        'System',
        'User',
      ]),
    );
  });

  test('each model has a valid tableName', () => {
    Object.values(models).forEach((model) => {
      expect(model.tableName).toBeDefined();
      expect(typeof model.tableName).toBe('string');
    });
  });

  test('User has associations to Prof and Student', () => {
    expect(models.User.associations.Prof).toBeDefined();
    expect(models.User.associations.Student).toBeDefined();
  });

  test('Student belongs to User, Prof, System', () => {
    expect(models.Student.associations.User).toBeDefined();
    expect(models.Student.associations.Prof).toBeDefined();
    expect(models.Student.associations.System).toBeDefined();
  });
});

describe('cssys_guidance model definitions', () => {
  const modelsDir = path.join(__dirname, '../../models/cssys_guidance');
  let models;

  beforeAll(() => {
    models = loadModelsFromDir(modelsDir);
  });

  test('loads all expected models', () => {
    expect(Object.keys(models)).toEqual(expect.arrayContaining(['GPermissionLog', 'Prof', 'Student', 'User']));
  });

  test('User has associations', () => {
    expect(models.User.associations.Prof).toBeDefined();
    expect(models.User.associations.Student).toBeDefined();
  });
});

describe('cssys_schedule model definitions', () => {
  const modelsDir = path.join(__dirname, '../../models/cssys_schedule');
  let models;

  beforeAll(() => {
    models = loadModelsFromDir(modelsDir);
  });

  test('loads all expected models', () => {
    expect(Object.keys(models)).toEqual(expect.arrayContaining(['Calendar', 'Post', 'Share', 'User']));
  });

  test('Calendar belongs to User and has Shares/Posts', () => {
    expect(models.Calendar.associations.User).toBeDefined();
    expect(models.Calendar.associations.Shares).toBeDefined();
    expect(models.Calendar.associations.Posts).toBeDefined();
  });
});
