using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CV.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class RemoveCandidatePublicId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Candidate_PublicId",
                table: "Candidate");

            migrationBuilder.DropColumn(
                name: "PublicId",
                table: "Candidate");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "PublicId",
                table: "Candidate",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            migrationBuilder.CreateIndex(
                name: "IX_Candidate_PublicId",
                table: "Candidate",
                column: "PublicId",
                unique: true);
        }
    }
}
