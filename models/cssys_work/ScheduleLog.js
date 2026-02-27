module.exports = function (sequelize, DataTypes) {
  var ScheduleLog = sequelize.define(
    'ScheduleLog',
    {
      phase: {
        type: DataTypes.STRING,
        defaultValue: '',
      },
      scheduletime: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: '원래 스케줄 일정',
      },
    },
    {
      tableName: 'cssys_work_schedulelog',
    },
  );
  return ScheduleLog;
};
