<?xml version="1.0" encoding="iso-8859-1"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
<xsl:output method="xml" encoding="utf-8" omit-xml-declaration="yes" />

<xsl:param name="ui"/>
<xsl:param name="ssid"/>
<xsl:param name="libraryTitle"/>
<xsl:param name="templates"/>
<xsl:param name="config"/>
<xsl:variable name="localLibraries" select="$config/mirc/Libraries/Library[@local='yes' and @enabled='yes' and @authenb='yes']"/>

<xsl:template match="/User">
	<html>
		<head>
			<title>Advanced Author Tool</title>
			<link rel="Stylesheet" type="text/css" media="all" href="/JSPopup.css"></link>
			<link rel="Stylesheet" type="text/css" media="all" href="/aauth/AuthorService.css"></link>
			<script language="JavaScript" type="text/javascript" src="/JSUtil.js">;</script>
			<script language="JavaScript" type="text/javascript" src="/JSPopup.js">;</script>
			<script language="JavaScript" type="text/javascript" src="/aauth/AuthorService.js">;</script>
			<script>
				var ui = '<xsl:value-of select="$ui"/>';
				<xsl:choose>
					<xsl:when test="$localLibraries[@id=$ssid]">
						var ssid = '<xsl:value-of select="$ssid"/>';
					</xsl:when>
					<xsl:otherwise>
						var ssid = '<xsl:value-of select="$localLibraries[position()=1]/@id"/>';
					</xsl:otherwise>
				</xsl:choose>
				var tokens = new Array();
				<xsl:for-each select="$templates/templates/template">
					tokens[tokens.length] = '<xsl:value-of select="token"/>';
				</xsl:for-each>
			</script>
		</head>
		<body>
			<xsl:if test="$ui='classic'">
				<div class="closebox">
					<img src="/icons/home.png"
						 onclick="window.open('/query','_self');"
						 title="Return to the home page"/>
					<br/>
					<img src="/icons/save.png"
						 onclick="save();"
						 title="Create the MIRCdocument and open it in the editor"/>
				</div>
			</xsl:if>

			<h1>Advanced Author Tool</h1>

			<form id="formID" action="" method="POST" accept-charset="UTF-8" >

			<p class="note">
				This page may be used by authors to create a MIRCdocument and submit it to a library.
			</p>

			<p class="instruction">Insert your name, affiliation, and contact information
			as they should appear under the title of the document:</p>
			<p class="center">
			<table border="1">
				<tr>
					<td class="text-label">Author's name:</td>
					<td class="text-field">
						<input class="input-length" name="name" value="{@name}"/>
					</td>
				</tr>
				<tr>
					<td class="text-label">Author's affiliation:</td>
					<td class="text-field">
						<input class="input-length" name="affiliation" value="{@affiliation}"/>
					</td>
				</tr>
				<tr>
					<td class="text-label">Author's phone or email:</td>
					<td class="text-field">
						<input class="input-length" name="contact" value="{@contact}"/>
					</td>
				</tr>
			</table>
			</p>

			<p class="instruction">Select the template to use for the new MIRCdocument:</p>
			<p class="center">
			<table border="1">
				<tr>
					<td class="text-label-top">Template:</td>
					<td class="text-field">
						<select name="templatename" id="templatename" onchange="templateChanged();">
							<xsl:for-each select="$templates/templates/template">
								<option value="{file}">
									<xsl:if test="position()=1">
										<xsl:attribute name="selected">true</xsl:attribute>
									</xsl:if>
									<xsl:value-of select="title"/>
								</option>
							</xsl:for-each>
						</select>
						<br/>
						<p class="centered"><img id="tokenIMG"/></p>
					</td>
				</tr>
			</table>
			</p>

			<xsl:if test="count($localLibraries)&gt;1">
				<p class="instruction">Select the library in which to store the MIRCdocument:</p>
				<p class="centered">
					<select id="libSelect" name="libSelect">
						<xsl:for-each select="$localLibraries">
							<option value="{@id}">
								<xsl:if test="@id=$ssid">
									<xsl:attribute name="selected">true</xsl:attribute>
								</xsl:if>
								<xsl:value-of select="title"/>
							</option>
						</xsl:for-each>
					</select>
				</p>
			</xsl:if>

			<p class="instruction">Click this button to open the selected template in the editor:
				<input type="button" value="Continue" onclick="save();"/>
			</p>
			<br/>

			</form>
		</body>
	</html>
</xsl:template>

</xsl:stylesheet>
