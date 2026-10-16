using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CV.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class AddCandidatePublicUrlSegmentAndOwner : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "OwnerEntraObjectId",
                table: "Candidate",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PublicUrlSegment",
                table: "Candidate",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.Sql(
                "UPDATE [Candidate] SET [PublicUrlSegment] = LOWER(CONVERT(varchar(36), [ID])) WHERE [PublicUrlSegment] IS NULL;");

            migrationBuilder.AlterColumn<string>(
                name: "PublicUrlSegment",
                table: "Candidate",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Candidate_OwnerEntraObjectId",
                table: "Candidate",
                column: "OwnerEntraObjectId");

            migrationBuilder.CreateIndex(
                name: "IX_Candidate_PublicUrlSegment",
                table: "Candidate",
                column: "PublicUrlSegment",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Candidate_OwnerEntraObjectId",
                table: "Candidate");

            migrationBuilder.DropIndex(
                name: "IX_Candidate_PublicUrlSegment",
                table: "Candidate");

            migrationBuilder.DropColumn(
                name: "OwnerEntraObjectId",
                table: "Candidate");

            migrationBuilder.DropColumn(
                name: "PublicUrlSegment",
                table: "Candidate");
        }
    }
}
