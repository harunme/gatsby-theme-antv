import React, { useState } from 'react';

import { graphql, Link } from 'gatsby';
import { Layout as AntLayout, Menu, Anchor, Affix } from 'antd';
import {
  createFromIconfontCN,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import SplitPane from 'react-split-pane';
import { groupBy } from 'lodash-es';
import { useTranslation } from 'react-i18next';
import Drawer from 'rc-drawer';
import { useMedia } from 'react-use';
import RehypeReact from 'rehype-react';
import Article from '../components/Article';
import SEO from '../components/Seo';

import PlayGround from '../components/PlayGround';
import NavigatorBanner from '../components/NavigatorBanner';
import APIDoc from '../components/APIDoc';
import CustomTag from '../components/CustomTag';
import CustomDesc from '../components/CustomDesc';
import { capitalize } from '../utils';
import { usePrevAndNext } from '../hooks';

import styles from './markdown.module.less';

const MenuIcon = createFromIconfontCN({
  scriptUrl: '//at.alicdn.com/t/font_470089_9m0keqj54r.js', // generated by iconfont.cn
});

const renderMenuItems = (edges: any[]) =>
  edges
    .filter((edge: any) => {
      const {
        node: {
          fields: { slug },
        },
      } = edge;
      if (slug.endsWith('/API') || slug.endsWith('/design')) {
        return false;
      }
      return true;
    })
    .sort((a: any, b: any) => {
      const {
        node: {
          frontmatter: { order: aOrder },
        },
      } = a;
      const {
        node: {
          frontmatter: { order: bOrder },
        },
      } = b;
      return aOrder - bOrder;
    })
    .map((edge: any) => {
      const {
        node: {
          frontmatter: { title, icon },
          fields: { slug },
        },
      } = edge;
      return (
        <Menu.Item key={slug}>
          <Link to={slug}>
            {icon && (
              <MenuIcon className={styles.menuIcon} type={`icon-${icon}`} />
            )}
            <span>{title}</span>
          </Link>
        </Menu.Item>
      );
    });

const getMenuItemLocaleKey = (slug = '') => {
  const slugPieces = slug.split('/');
  const menuItemLocaleKey = slugPieces
    .slice(slugPieces.indexOf('examples') + 1)
    .filter((key) => key)
    .join('/');
  return menuItemLocaleKey;
};

const getExampleOrder = ({
  groupedEdgeKey = '',
  examples = [],
  groupedEdges = {},
}: {
  groupedEdgeKey: string;
  examples: any[];
  groupedEdges: {
    [key: string]: any[];
  };
}): number => {
  const key = getMenuItemLocaleKey(groupedEdgeKey);
  if (examples.find((item) => item.slug === key)) {
    return (examples.findIndex((item) => item.slug === key) || 0) + 100;
  }
  if (!groupedEdges[groupedEdgeKey] && !groupedEdges[groupedEdgeKey].length) {
    return 0;
  }
  return groupedEdges[groupedEdgeKey][0].node.frontmatter.order || 0;
};

export default function Template({
  data, // this prop will be injected by the GraphQL query below.
  location,
  pageContext,
}: {
  data: any;
  location: Location;
  pageContext: {
    exampleSections: any;
    allDemos?: any[];
  };
}) {
  const { allMarkdownRemark, site } = data; // data.markdownRemark holds our post data
  const { edges = [] } = allMarkdownRemark;

  const edgesInExamples = edges;
  const pathWithoutTrailingSlashes = location.pathname.replace(/\/$/, '');
  const { node: markdownRemark } =
    edgesInExamples.find((edge: any) => {
      const {
        fields: { slug },
      } = edge.node;
      if (
        /\/examples\/.*\/API$/.test(pathWithoutTrailingSlashes) ||
        /\/examples\/.*\/design$/.test(pathWithoutTrailingSlashes)
      ) {
        return pathWithoutTrailingSlashes.indexOf(slug) >= 0;
      }
      return (
        pathWithoutTrailingSlashes === slug ||
        pathWithoutTrailingSlashes.endsWith(slug)
      );
    }) || {};
  if (!markdownRemark) {
    return null;
  }

  const {
    frontmatter,
    htmlAst,
    fields: { slug },
    parent: { relativePath },
  } = markdownRemark;
  const {
    siteMetadata: { examples = [], githubUrl, playground },
  } = site;
  const { i18n } = useTranslation();
  const renderAst = new RehypeReact({
    createElement: React.createElement,
    components: {
      tag: CustomTag,
      description: CustomDesc,
    },
  }).Compiler;
  const groupedEdges = groupBy(
    edgesInExamples,
    ({
      node: {
        fields: { slug: slugString },
      },
    }: any) => {
      // API.md and deisgn.md
      if (slugString.endsWith('/API') || slugString.endsWith('/design')) {
        return slugString.split('/').slice(0, -2).join('/');
      }
      // index.md
      return slugString.split('/').slice(0, -1).join('/');
    },
  );
  const defaultOpenKeys = Object.keys(groupedEdges).filter((key) =>
    slug.startsWith(key),
  );
  const [openKeys, setOpenKeys] = useState<string[]>(defaultOpenKeys);

  const { exampleSections = {}, allDemos = [] } = pageContext;
  const [prev, next] = usePrevAndNext();

  const menu = (
    <Menu
      mode="inline"
      selectedKeys={[slug]}
      style={{ height: '100%' }}
      openKeys={openKeys}
      onOpenChange={(currentOpenKeys) =>
        setOpenKeys(currentOpenKeys as string[])
      }
      forceSubMenuRender
    >
      {Object.keys(groupedEdges)
        .filter((key) => key.startsWith(`/${i18n.language}/`))
        .sort((a: string, b: string) => {
          const aOrder = getExampleOrder({
            groupedEdgeKey: a,
            examples,
            groupedEdges,
          });
          const bOrder = getExampleOrder({
            groupedEdgeKey: b,
            examples,
            groupedEdges,
          });
          return aOrder - bOrder;
        })
        .map((slugString) => {
          const slugPieces = slugString.split('/');
          if (slugPieces.length <= 3) {
            return renderMenuItems(groupedEdges[slugString]);
          }
          const menuItemLocaleKey = getMenuItemLocaleKey(slugString);
          const doc =
            examples.find((item: any) => item.slug === menuItemLocaleKey) || {};
          return (
            <Menu.SubMenu
              key={slugString}
              title={
                <div>
                  {doc.icon && (
                    <MenuIcon
                      className={styles.menuIcon}
                      type={`icon-${doc.icon}`}
                    />
                  )}
                  <span>
                    {doc && doc.title
                      ? capitalize(doc.title[i18n.language])
                      : menuItemLocaleKey}
                  </span>
                </div>
              }
            >
              {renderMenuItems(groupedEdges[slugString])}
            </Menu.SubMenu>
          );
        })}
    </Menu>
  );

  const isWide = useMedia('(min-width: 767.99px)', true);
  const [drawOpen, setDrawOpen] = useState(false);
  const menuSider = (
    <Affix
      offsetTop={0}
      className={styles.affix}
      style={{ height: isWide ? '100vh' : 'inherit' }}
    >
      {isWide ? (
        <AntLayout.Sider width="auto" theme="light" className={styles.sider}>
          {menu}
        </AntLayout.Sider>
      ) : (
        <Drawer
          handler={
            drawOpen ? (
              <MenuFoldOutlined className={styles.menuSwitch} />
            ) : (
              <MenuUnfoldOutlined className={styles.menuSwitch} />
            )
          }
          wrapperClassName={styles.menuDrawer}
          onChange={(open) => setDrawOpen(!!open)}
          width={280}
        >
          {menu}
        </Drawer>
      )}
    </Affix>
  );
  const allDemosInCategory = groupBy(allDemos || [], (demo) => {
    if (!demo.postFrontmatter || !demo.postFrontmatter[i18n.language]) {
      return 'OTHER';
    }
    return demo.postFrontmatter[i18n.language].title;
  });

  const Categories = Object.keys(allDemosInCategory).sort(
    (a: string, b: string) => {
      if (a === 'OTHER') {
        return -1;
      }
      if (b === 'OTHER') {
        return 1;
      }
      return (
        allDemosInCategory[a][0].postFrontmatter[i18n.language].order -
        allDemosInCategory[b][0].postFrontmatter[i18n.language].order
      );
    },
  );

  const galleryPageContent = (
    <div className={styles.gallery}>
      <div className={styles.anchor}>
        <Anchor>
          {Categories.map((category: string, i) => (
            <Anchor.Link
              href={`#category-${category}`}
              key={i}
              title={category}
            />
          ))}
        </Anchor>
      </div>
      <div className={styles.galleryContent}>
        <h1>{frontmatter.title}</h1>
        <div>{renderAst(htmlAst)}</div>
        {Categories.map((category: string, i) => (
          <div key={i}>
            {category !== 'OTHER' && (
              <h2 id={`category-${category}`}>{category}</h2>
            )}
            <ul className={styles.galleryList}>
              {allDemosInCategory[category]
                .sort((a, b) => {
                  return (a.order || -1) - (b.order || -1);
                })
                .map((demo) => {
                  let cardTitle;
                  if (typeof demo.title === 'string') {
                    cardTitle = demo.title;
                  } else {
                    cardTitle = demo.title
                      ? demo.title[i18n.language]
                      : demo.filename;
                  }
                  const demoSlug = demo.relativePath.replace(
                    /\/demo\/(.*)\..*/,
                    (_: string, filename: string) => {
                      return `#${filename}`;
                    },
                  );
                  return (
                    <li
                      className={styles.galleryCard}
                      key={demo.relativePath}
                      title={cardTitle}
                    >
                      <Link
                        to={`/${i18n.language}/examples/${demoSlug}`}
                        className={styles.galleryCardLink}
                      >
                        <img
                          src={
                            demo.screenshot ||
                            'https://gw.alipayobjects.com/os/s/prod/antv/assets/image/screenshot-placeholder-b8e70.png'
                          }
                          alt={cardTitle}
                        />
                        <h4>{cardTitle}</h4>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );

  const dispatchResizeEvent = () => {
    const e = new Event('resize');
    window.dispatchEvent(e);
  };

  const exmaplePageContent = (
    <div className={styles.exampleContent}>
      <SplitPane
        split={isWide ? 'vertical' : 'horizontal'}
        defaultSize="60%"
        minSize={100}
        onDragFinished={dispatchResizeEvent}
      >
        {exampleSections.examples && exampleSections.examples.length > 0 && (
          <>
            <PlayGround
              examples={exampleSections.examples}
              location={location}
              playground={playground || {}}
            />
          </>
        )}
        <APIDoc
          slug={slug}
          pathWithoutTrailingSlashes={pathWithoutTrailingSlashes}
          relativePath={relativePath}
          githubUrl={githubUrl}
          frontmatter={frontmatter}
          exampleSections={exampleSections}
          renderAst={renderAst}
          htmlAst={htmlAst}
        />
      </SplitPane>
    </div>
  );

  return (
    <>
      <SEO title={frontmatter.title} lang={i18n.language} />
      <AntLayout
        style={{ background: '#fff' }}
        hasSider
        className={styles.layout}
      >
        {pathWithoutTrailingSlashes.endsWith('/examples/gallery')
          ? menuSider
          : null}

        <Article className={styles.markdown}>
          <div className={styles.main} style={{ width: '100%' }}>
            {pathWithoutTrailingSlashes.endsWith('/examples/gallery') ? (
              galleryPageContent
            ) : (
              <div className={styles.exampleLayout}>{exmaplePageContent}</div>
            )}
            {pathWithoutTrailingSlashes.endsWith('/examples/gallery') ? (
              <div>
                <NavigatorBanner type="prev" post={prev} />
                <NavigatorBanner type="next" post={next} />
              </div>
            ) : null}
          </div>
        </Article>
      </AntLayout>
    </>
  );
}

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
        githubUrl
        examples {
          slug
          icon
          title {
            zh
            en
          }
        }
        playground {
          container
          playgroundDidMount
          playgroundWillUnmount
          dependencies
          htmlCodeTemplate
        }
      }
      pathPrefix
    }
    allMarkdownRemark(
      filter: { fields: { slug: { regex: "//examples//" } } }
      sort: { order: ASC, fields: [frontmatter___order] }
      limit: 1000
    ) {
      edges {
        node {
          htmlAst
          fields {
            slug
          }
          frontmatter {
            title
            order
            icon
          }
          parent {
            ... on File {
              relativePath
            }
          }
        }
      }
    }
  }
`;
