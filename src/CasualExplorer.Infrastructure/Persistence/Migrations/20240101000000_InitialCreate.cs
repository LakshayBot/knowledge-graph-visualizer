using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CasualExplorer.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── users ──────────────────────────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id            = table.Column<Guid>(type: "uuid", nullable: false),
                    email         = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    username      = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    password_hash = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    role          = table.Column<string>(type: "character varying(50)",  maxLength: 50,  nullable: false),
                    is_active     = table.Column<bool>(type: "boolean", nullable: false),
                    last_login_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at    = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at    = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "uq_users_email",
                table: "users",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "uq_users_username",
                table: "users",
                column: "username",
                unique: true);

            // ── refresh_tokens ─────────────────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "refresh_tokens",
                columns: table => new
                {
                    id            = table.Column<Guid>(type: "uuid", nullable: false),
                    token         = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    user_id       = table.Column<Guid>(type: "uuid", nullable: false),
                    expires_at    = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_revoked    = table.Column<bool>(type: "boolean", nullable: false),
                    created_by_ip = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true),
                    created_at    = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_refresh_tokens", x => x.id);
                    table.ForeignKey(
                        name: "FK_refresh_tokens_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "uq_refresh_tokens_token",
                table: "refresh_tokens",
                column: "token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_refresh_tokens_user_id",
                table: "refresh_tokens",
                column: "user_id");

            // ── causal_chains ──────────────────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "causal_chains",
                columns: table => new
                {
                    id              = table.Column<Guid>(type: "uuid", nullable: false),
                    root_event_id   = table.Column<Guid>(type: "uuid", nullable: false),
                    title           = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    domain          = table.Column<string>(type: "character varying(50)",  maxLength: 50,  nullable: false),
                    last_updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    node_count      = table.Column<int>(type: "integer", nullable: false),
                    view_count      = table.Column<int>(type: "integer", nullable: false),
                    created_at      = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at      = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_causal_chains", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_causal_chains_domain",
                table: "causal_chains",
                column: "domain");

            migrationBuilder.CreateIndex(
                name: "ix_causal_chains_view_count",
                table: "causal_chains",
                column: "view_count");

            // ── user_saved_chains ──────────────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "user_saved_chains",
                columns: table => new
                {
                    user_id  = table.Column<Guid>(type: "uuid", nullable: false),
                    chain_id = table.Column<Guid>(type: "uuid", nullable: false),
                    saved_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    notes    = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_saved_chains", x => new { x.user_id, x.chain_id });
                    table.ForeignKey(
                        name: "FK_user_saved_chains_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_user_saved_chains_causal_chains_chain_id",
                        column: x => x.chain_id,
                        principalTable: "causal_chains",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_user_saved_chains_chain_id",
                table: "user_saved_chains",
                column: "chain_id");

            // ── event_nodes ────────────────────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "event_nodes",
                columns: table => new
                {
                    id               = table.Column<Guid>(type: "uuid", nullable: false),
                    title            = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    summary          = table.Column<string>(type: "character varying(5000)", maxLength: 5000, nullable: false),
                    event_date       = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    domain           = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    confidence_score = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: false),
                    freshness_score  = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: false),
                    perspectives     = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    sources          = table.Column<string>(type: "jsonb", nullable: true),
                    is_verified      = table.Column<bool>(type: "boolean", nullable: false),
                    created_at       = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at       = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_event_nodes", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_event_nodes_domain",
                table: "event_nodes",
                column: "domain");

            migrationBuilder.CreateIndex(
                name: "ix_event_nodes_event_date",
                table: "event_nodes",
                column: "event_date");

            migrationBuilder.CreateIndex(
                name: "ix_event_nodes_is_verified",
                table: "event_nodes",
                column: "is_verified");

            // ── causal_edges ───────────────────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "causal_edges",
                columns: table => new
                {
                    id                = table.Column<Guid>(type: "uuid", nullable: false),
                    from_event_id     = table.Column<Guid>(type: "uuid", nullable: false),
                    to_event_id       = table.Column<Guid>(type: "uuid", nullable: false),
                    relationship_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    strength          = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: false),
                    perspective       = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    explanation       = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    is_contested      = table.Column<bool>(type: "boolean", nullable: false),
                    sources           = table.Column<string>(type: "jsonb", nullable: true),
                    created_at        = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at        = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_causal_edges", x => x.id);
                    table.ForeignKey(
                        name: "FK_causal_edges_event_nodes_from_event_id",
                        column: x => x.from_event_id,
                        principalTable: "event_nodes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_causal_edges_event_nodes_to_event_id",
                        column: x => x.to_event_id,
                        principalTable: "event_nodes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_causal_edges_from_event_id",
                table: "causal_edges",
                column: "from_event_id");

            migrationBuilder.CreateIndex(
                name: "ix_causal_edges_to_event_id",
                table: "causal_edges",
                column: "to_event_id");

            migrationBuilder.CreateIndex(
                name: "ix_causal_edges_from_to",
                table: "causal_edges",
                columns: new[] { "from_event_id", "to_event_id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "causal_edges");
            migrationBuilder.DropTable(name: "user_saved_chains");
            migrationBuilder.DropTable(name: "causal_chains");
            migrationBuilder.DropTable(name: "refresh_tokens");
            migrationBuilder.DropTable(name: "event_nodes");
            migrationBuilder.DropTable(name: "users");
        }
    }
}
