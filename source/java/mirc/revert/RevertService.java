/*---------------------------------------------------------------
*  Copyright 2011 by the Radiological Society of North America
*
*  This source software is released under the terms of the
*  RSNA Public License (http://mirc.rsna.org/rsnapubliclicense)
*----------------------------------------------------------------*/

package mirc.revert;

import java.io.File;

import mirc.MircConfig;
import mirc.storage.Index;
import mirc.util.MircDocument;

import org.rsna.server.HttpRequest;
import org.rsna.server.HttpResponse;
import org.rsna.server.Path;
import org.rsna.server.User;
import org.rsna.servlets.Servlet;

import org.apache.log4j.Logger;

import org.w3c.dom.Document;
import org.w3c.dom.Element;

/**
 * Servlet to convert a MIRCdocument back to draft mode.
 * This service accepts only a GET and returns the modified MIRCdocument.
 */
public class RevertService extends Servlet {

	static final Logger logger = Logger.getLogger(RevertService.class);

	/**
	 * Construct a RevertService servlet.
	 * @param root the root directory of the server.
	 * @param context the path identifying the servlet.
	 */
	public RevertService(File root, String context) {
		super(root, context);
		//Override the root supplied by the HttpServer
		//with the root of the MIRC plugin.
		this.root = MircConfig.getInstance().getRootDirectory();
	}

	/**
	 * Convert the document to draft mode, if possible, and return the modified MIRCdocument.
	 * @param req The HttpRequest provided by the servlet container.
	 * @param res The HttpResponse provided by the servlet container.
	 * @throws ServletException if the servlet cannot handle the request.
	 */
	public void doGet(HttpRequest req, HttpResponse res) throws Exception {

		//Only accept connections from authenticated users
		if (!req.isFromAuthenticatedUser()) { res.redirect("/query"); return; }

		Path path = req.getParsedPath();
		String ssid = path.element(1);
		if (ssid.startsWith("ss")) {

			//Make sure the document authorizes updates by this user
			MircConfig mc = MircConfig.getInstance();
			Element lib = mc.getLocalLibrary(ssid);
			boolean enabled = ((lib != null) && lib.getAttribute("authenb").equals("yes"));
			if (enabled) {

				//Get the document
				Index index = Index.getInstance(ssid);
				String docPath = path.subpath(3).substring(1);
				File docsDir = index.getDocumentsDir();
				File docFile = new File( docsDir, docPath );
				MircDocument md = new MircDocument(docFile);

				//See if we can update this document
				if (md.authorizes( "update", req.getUser() )) {

					//See if we can revert the document to draft mode.
					//This is only possible if the root element's temp attribute
					//is not "yes" and the draftpath attribute is non-blank.
					Document doc = md.getXML();
					Element root = doc.getDocumentElement();
					String temp = root.getAttribute("temp");
					String draftpath = root.getAttribute("draftpath");
					if (!temp.equals("yes") && !draftpath.equals("")) {

						Path newpath = new Path(draftpath);
						String basepath = newpath.subpath(2).substring(1);

						//First, set the temp attribute to indicate that
						//the document is a draft. Note that we keep the
						//draftpath attribute so the Advanced Author Tool
						//won't replace the titles if the document is edited.
						root.setAttribute("temp", "yes");
						md.save();

						//Now change the directory name
						File parent = docFile.getParentFile();
						File newDocFile = new File( docsDir, basepath );
						File destination = newDocFile.getParentFile();

						if (!parent.renameTo(destination)) {
							logger.warn("Unable to rename to draft status");
						}

						//Remove the document from the index
						index.removeDocument(index.getKey(docFile));

						//Index the document in its current location
						index.insertDocument(index.getKey(newDocFile));
						index.commit();

						//Redirect to the document in the new location
						res.redirect("/storage" + draftpath);
						return;
					}
				}
			}
		}
		//If we ever get here, something isn the UI is wrong or somebody
		//is typing in a URL; just redirect to the query page.
		res.redirect("/query");
	}

}