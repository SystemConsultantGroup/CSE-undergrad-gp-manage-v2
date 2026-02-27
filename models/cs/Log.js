module.exports = function(sequelize, DataTypes) {
    var Log = sequelize.define("Log", {
        model: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false,
            comment: "모델명"
        },
        comment: {
            type: DataTypes.STRING,
            defaultValue: "",
            comment: "설명"
        }
    }, {
        tableName: 'cs_log_category',
        comment: "cs 로그 카테고리 분류"
    });

    Log.associate = function(models) {
        Log.hasMany(models.LogData);
    };

    return Log;
};