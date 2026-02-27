module.exports = function (sequelize, DataTypes) {
  var MajorClass = sequelize.define(
    'MajorClass',
    {
      code: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        comment: '과목 코드',
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '과목명',
      },
      text: {
        type: DataTypes.TEXT,
        defaultValue: '',
        comment: '과목 소개',
      },
      type: {
        type: DataTypes.STRING,
        defaultValue: '',
        comment: '과목 종류',
      },
      credit: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '학점',
      },
    },
    {
      tableName: 'cs_major_class',
      comment: 'cs 전공 수업',
    },
  );

  MajorClass.associate = function (models) {
    MajorClass.belongsTo(models.Major);
  };

  return MajorClass;
};
