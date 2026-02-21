module.exports = function(sequelize, DataTypes) {
    var Board = sequelize.define('Board', {
        title: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false
        },
        comment: {
            type: DataTypes.STRING,
            defaultValue: ''
        }
    }, {
        tableName: 'cssys_board_category',
        comment: '게시판 카테고리 분류',
        classMethods: {
            associate: function(models) {
                Board.hasMany(models.BoardPost);
                Board.hasMany(models.BoardFile);
            }
        }
    });
    return Board;
};