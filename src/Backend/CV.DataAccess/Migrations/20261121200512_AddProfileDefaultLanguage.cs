using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CV.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class AddProfileDefaultLanguage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DefaultLanguageCode",
                table: "Profile",
                type: "nvarchar(5)",
                maxLength: 5,
                nullable: false,
                defaultValue: "fi");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DefaultLanguageCode",
                table: "Profile");
        }
    }
}
