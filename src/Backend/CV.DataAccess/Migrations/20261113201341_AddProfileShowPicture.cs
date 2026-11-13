using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CV.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class AddProfileShowPicture : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Existing CVs keep showing their picture. The DEFAULT (1) constraint this creates stays in the
            // database, but the model doesn't know it, so EF always writes the value itself. A model default
            // of true would turn an inserted false into true; new profiles get true from the entity.
            migrationBuilder.AddColumn<bool>(
                name: "ShowPicture",
                table: "Profile",
                type: "bit",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ShowPicture",
                table: "Profile");
        }
    }
}
