module.exports = function (sequelize, DataTypes) {
  var Schedule = sequelize.define(
    'Schedule',
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      text: {
        type: DataTypes.TEXT,
        defaultValue: '',
        comment: '(내용 컬럼인데 타이틀만 필요하면 지우기)',
      },
      start: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      end: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      color: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '#FFFFFF',
        comment: '디폴트 색 알아서 수정 (색 사용안하면 이것도 지우기)',
      },
    },
    {
      tableName: 'cs_schedule',
      comment: 'cs 일정',
    },
  );
  return Schedule;
};
