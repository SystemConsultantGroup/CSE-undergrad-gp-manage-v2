module.exports = function (sequelize, DataTypes) {
  var AdmPost = sequelize.define(
    'AdmPost',
    {
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      text: {
        type: DataTypes.TEXT,
        defaultValue: '',
        comment: '(내용 컬럼인데 타이틀만 필요하면 지우기)',
      },
      time: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      checked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: 'cs_adm_post',
      comment: 'cs 행정실 등기 및 소포',
    },
  );
  return AdmPost;
};
