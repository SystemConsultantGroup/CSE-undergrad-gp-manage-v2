module.exports = function(sequelize, DataTypes) {
    var BoardPost = sequelize.define("BoardPost", {
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        text: {
            type: DataTypes.TEXT
        },        
        time: {
            type: DataTypes.DATE,
            allowNull: false
        },
        ip: {
            type: DataTypes.STRING(15),
            allowNull: false,
            validate: {
                isIPv4: true
            }
        },
        views: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        fix:{
            type:DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: "게시판 상단 고정 여부"
        },
        main:{
            type:DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: "메인 노출 여부"
        }
    }, {
        tableName: 'cs_board_post',
        comment: "cs 게시판 게시물"
    });

    BoardPost.associate = function(models) {
        BoardPost.belongsTo(models.User);
        BoardPost.belongsTo(models.Board);
        BoardPost.hasMany(models.BoardFile);
    };

    return BoardPost;
};