module.exports = function (sequelize, DataTypes) {
  var Permission = sequelize.define(
    'Permission',
    {
      yearterm: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '지망 년도 및 학기',
      },
      order: {
        type: DataTypes.INTEGER(1),
        allowNull: false,
        defaultValue: 1,
        comment: '지망 차수 (1차, 2차, 3차 선택)',
      },
      firstSelected: {
        type: DataTypes.BOOLEAN,
        defaultValue: null,
      },
      secondSelected: {
        type: DataTypes.BOOLEAN,
        defaultValue: null,
      },
      thirdSelected: {
        type: DataTypes.BOOLEAN,
        defaultValue: null,
      },
    },
    {
      tableName: 'cssys_work_permission',
      comment: '교수 신청',
    },
  );

  Permission.associate = function (models) {
    Permission.belongsTo(models.Prof, {
      as: 'firstProf',
    });
    Permission.belongsTo(models.Prof, {
      as: 'secondProf',
    });
    Permission.belongsTo(models.Prof, {
      as: 'thirdProf',
    });
    Permission.belongsTo(models.Prof);
    Permission.belongsTo(models.Student);
  };

  return Permission;
};
