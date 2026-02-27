module.exports = function (sequelize, DataTypes) {
  var Dean = sequelize.define(
    'Dean',
    {
      year: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      term: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING(10),
        defaultValue: '',
        comment: '학번',
      },
      photo: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '', // 이부분 나중에 디폴드 이미지 생기면 넣어주기
        comment: '이미지 경로',
      },
    },
    {
      tableName: 'cs_dean',
      comment: 'cs 딘스리스트',
    },
  );
  return Dean;
};
