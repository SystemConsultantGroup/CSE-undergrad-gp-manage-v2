module.exports = function (sequelize, DataTypes) {
  var System = sequelize.define(
    'System',
    {
      phase: {
        type: DataTypes.STRING,
        defaultValue: '',
      },
      start: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: '시작 날짜',
      },
      end: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: '종료 날짜',
      },
      reupload: {
        type: DataTypes.INTEGER,
        comment: '교수 승인 및 반려, 재업로드 기간을 위한 칼럼',
      },
    },
    {
      tableName: 'cssys_work_system',
      comment: '시스템 단계',
    },
  );

  System.associate = function (models) {
    System.hasMany(models.Student);
  };

  return System;
};
