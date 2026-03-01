module.exports = function (sequelize, DataTypes) {
  var Post = sequelize.define(
    'Post',
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      text: {
        type: DataTypes.TEXT,
        defaultValue: '',
      },
      bgcolor: {
        type: DataTypes.STRING(7),
        allowNull: false,
        defaultValue: '#68b828',
      },
      fontcolor: {
        type: DataTypes.STRING(7),
        allowNull: false,
        defaultValue: '#ffffff',
      },
      start: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      end: {
        type: DataTypes.DATE,
        allowNull: false,
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
      tableName: 'cssys_schedule_post',
      comment: '일정관리시스템 일정 정보',
    },
  );

  Post.associate = function (models) {
    Post.belongsTo(models.User);
    Post.belongsTo(models.Calendar);
    Post.belongsTo(models.Share);
  };

  return Post;
};
