module.exports = function (sequelize, DataTypes) {
  var UserLog = sequelize.define(
    'UserLog',
    {
      success: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      ids: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      password: {
        type: DataTypes.STRING,
      },
      time: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      ip: {
        type: DataTypes.STRING(127),
        allowNull: false,
      },
    },
    {
      tableName: 'cssys_user_log',
    },
  );

  UserLog.associate = function (models) {
    UserLog.belongsTo(models.User);
  };

  return UserLog;
};
