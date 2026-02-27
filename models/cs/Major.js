module.exports = function(sequelize, DataTypes) {
    var Major = sequelize.define("Major", {
        major: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false
        },
        degree: {
            type: DataTypes.STRING,
            allowNull: false
        },        
        comment: {
            type: DataTypes.STRING,
            defaultValue: ""
        }
    }, {
        tableName: 'cs_major_category',
        comment: "cs 전공 카테고리 분류"
    });

    Major.associate = function(models) {
        Major.hasMany(models.MajorProf);
        Major.hasMany(models.MajorClass);
    };

    return Major;
};