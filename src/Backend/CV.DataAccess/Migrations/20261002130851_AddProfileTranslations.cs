using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CV.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class AddProfileTranslations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProfileTranslation",
                columns: table => new
                {
                    ID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProfileId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LanguageCode = table.Column<string>(type: "nvarchar(5)", maxLength: 5, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Summary = table.Column<string>(type: "nvarchar(2500)", maxLength: 2500, nullable: true),
                    Location = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProfileTranslation", x => x.ID);
                    table.ForeignKey(
                        name: "FK_ProfileTranslation_Profile_ProfileId",
                        column: x => x.ProfileId,
                        principalTable: "Profile",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.Sql("""
                INSERT INTO [ProfileTranslation]
                    ([ID], [ProfileId], [LanguageCode], [Title], [Summary], [Location], [CreatedAt], [UpdatedAt])
                SELECT NEWID(), [ID], N'fi', [Title], [Summary], [Location], [CreatedAt], [UpdatedAt]
                FROM [Profile];
                """);

            migrationBuilder.CreateIndex(
                name: "IX_ProfileTranslation_ProfileId_LanguageCode",
                table: "ProfileTranslation",
                columns: new[] { "ProfileId", "LanguageCode" },
                unique: true);

            migrationBuilder.DropColumn(
                name: "Location",
                table: "Profile");

            migrationBuilder.DropColumn(
                name: "Summary",
                table: "Profile");

            migrationBuilder.DropColumn(
                name: "Title",
                table: "Profile");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Location",
                table: "Profile",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Summary",
                table: "Profile",
                type: "nvarchar(2500)",
                maxLength: 2500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "Profile",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql("""
                UPDATE [Profile]
                SET [Title] = COALESCE([ProfileTranslation].[Title], N''),
                    [Summary] = [ProfileTranslation].[Summary],
                    [Location] = [ProfileTranslation].[Location]
                FROM [Profile]
                LEFT JOIN [ProfileTranslation]
                    ON [Profile].[ID] = [ProfileTranslation].[ProfileId]
                    AND [ProfileTranslation].[LanguageCode] = N'fi';
                """);

            migrationBuilder.DropTable(
                name: "ProfileTranslation");
        }
    }
}
