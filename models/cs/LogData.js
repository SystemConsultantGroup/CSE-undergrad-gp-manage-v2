module.exports = function (sequelize, DataTypes) {
  var LogData = sequelize.define(
    'LogData',
    {
      type: {
        type: DataTypes.ENUM('insert', 'update', 'delete'),
        allowNull: false,
        comment: '로그 종류',
      },
      text: {
        type: DataTypes.TEXT,
        defaultValue: '',
        comment: '설명',
      },
      time: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      ip: {
        type: DataTypes.STRING(15),
        allowNull: false,
        validate: {
          isIPv4: true,
        },
      },
      model_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: 'cs_log_data',
      comment: 'cs 로그 데이터',
      engine: 'MYISAM',
    },
  );

  LogData.associate = function (models) {
    LogData.belongsTo(models.Log);
  };

  return LogData;
};
