using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CV.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class AddCandidateLoginDropOwnerEntraObjectId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Candidate_OwnerEntraObjectId",
                table: "Candidate");

            migrationBuilder.DropColumn(
                name: "OwnerEntraObjectId",
                table: "Candidate");

            migrationBuilder.CreateTable(
                name: "CandidateLogin",
                columns: table => new
                {
                    ID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CandidateId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Provider = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ProviderTenantId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    ProviderUserId = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    LastSignInAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CandidateLogin", x => x.ID);
                    table.ForeignKey(
                        name: "FK_CandidateLogin_Candidate_CandidateId",
                        column: x => x.CandidateId,
                        principalTable: "Candidate",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CandidateLogin_CandidateId",
                table: "CandidateLogin",
                column: "CandidateId");

            migrationBuilder.CreateIndex(
                name: "IX_CandidateLogin_Provider_ProviderTenantId_ProviderUserId",
                table: "CandidateLogin",
                columns: new[] { "Provider", "ProviderTenantId", "ProviderUserId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CandidateLogin");

            migrationBuilder.AddColumn<string>(
                name: "OwnerEntraObjectId",
                table: "Candidate",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Candidate_OwnerEntraObjectId",
                table: "Candidate",
                column: "OwnerEntraObjectId");
        }
    }
}
